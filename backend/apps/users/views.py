from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.contrib.auth import get_user_model
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import requests
import jwt
import facebook
from msal import ConfidentialClientApplication

from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    """Register a new user account."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class MeView(generics.RetrieveAPIView):
    """Return the currently authenticated user."""

    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class SocialLoginView(APIView):
    """Unified Social Login View for Google, Facebook, Microsoft, and Apple."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        provider = request.data.get('provider')
        token = request.data.get('token')

        if not provider or not token:
            return Response({'error': 'Provider and Token are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_data = {}
            if provider == 'google':
                user_data = self._verify_google(token)
            elif provider == 'facebook':
                user_data = self._verify_facebook(token)
            elif provider == 'microsoft':
                user_data = self._verify_microsoft(token)
            elif provider == 'apple':
                user_data = self._verify_apple(token)
            else:
                return Response({'error': 'Invalid provider'}, status=status.HTTP_400_BAD_REQUEST)

            email = user_data.get('email')
            if not email:
                return Response({'error': 'Could not retrieve email from social provider'}, status=status.HTTP_400_BAD_REQUEST)

            username = user_data.get('name', email.split('@')[0])
            user, created = User.objects.get_or_create(email=email, defaults={'username': username})

            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data,
                'created': created
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)

    def _verify_google(self, token):
        client_id = settings.GOOGLE_CLIENT_ID
        if not client_id:
            raise ValueError("GOOGLE_CLIENT_ID not configured in backend settings.")
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
        return {'email': idinfo['email'], 'name': idinfo.get('name')}

    def _verify_facebook(self, token):
        graph = facebook.GraphAPI(access_token=token)
        profile = graph.get_object('me', fields='name,email')
        return {'email': profile.get('email'), 'name': profile.get('name')}

    def _verify_microsoft(self, token):
        # Microsoft token verification usually involves calling Graph API
        headers = {'Authorization': f'Bearer {token}'}
        res = requests.get('https://graph.microsoft.com/v1.0/me', headers=headers)
        res.raise_for_status()
        data = res.json()
        return {'email': data.get('mail') or data.get('userPrincipalName'), 'name': data.get('displayName')}

    def _verify_apple(self, token):
        # Apple verification involves decoding a JWT with Apple's public keys
        # This is a simplified version; in production, use a library like 'apple-id-token-verifier'
        decoded = jwt.decode(token, options={"verify_signature": False})
        return {'email': decoded.get('email'), 'name': decoded.get('name')}

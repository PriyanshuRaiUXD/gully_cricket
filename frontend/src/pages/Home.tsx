import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-700 to-green-900 text-white">
      <h1 className="text-5xl font-bold mb-4">🏏 Gully Cricket</h1>
      <p className="text-xl mb-8 text-green-200">
        Organize tournaments. Score ball-by-ball. Track rankings.
      </p>
      <div className="flex gap-4">
        <Link
          to="/login"
          className="px-6 py-3 bg-white text-green-800 font-semibold rounded-lg hover:bg-green-100 transition"
        >
          Login
        </Link>
        <Link
          to="/register"
          className="px-6 py-3 border-2 border-white font-semibold rounded-lg hover:bg-white hover:text-green-800 transition"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
}

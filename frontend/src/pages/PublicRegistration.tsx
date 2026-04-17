import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import publicApi from "../services/publicApi";
import type { Tournament } from "../types";
import { PublicNav } from "../components/layout/PublicNav";
import { 
  Users, UserPlus, Trash2, ArrowLeft, 
  ShieldCheck, Trophy, Zap, Send 
} from "lucide-react";
import toast from "react-hot-toast";
import { PageLoader } from "../components/ui/Spinner";

export default function PublicRegistration() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [teamName, setTeamName] = useState("");
  const [players, setPlayers] = useState<string[]>([""]);

  useEffect(() => {
    if (!tournamentId) return;
    publicApi.get(`/tournaments/${tournamentId}/`)
      .then(res => {
        setTournament(res.data);
        if (res.data.status !== 'SETUP') {
          toast.error("Registration is closed for this tournament.");
          navigate(`/tournament/${tournamentId}`);
        }
      })
      .catch(() => toast.error("Failed to load tournament details"))
      .finally(() => setLoading(false));
  }, [tournamentId, navigate]);

  const addPlayerField = () => {
    if (players.length < (tournament?.players_per_team || 11)) {
      setPlayers([...players, ""]);
    } else {
      toast.error(`Maximum ${tournament?.players_per_team} players allowed.`);
    }
  };

  const removePlayerField = (index: number) => {
    if (players.length > 1) {
      const newPlayers = [...players];
      newPlayers.splice(index, 1);
      setPlayers(newPlayers);
    }
  };

  const updatePlayerName = (index: number, name: string) => {
    const newPlayers = [...players];
    newPlayers[index] = name;
    setPlayers(newPlayers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return toast.error("Team name is required.");
    
    const validPlayers = players.map(p => p.trim()).filter(Boolean);
    if (validPlayers.length < 2) return toast.error("At least 2 players are required.");

    setSubmitting(true);
    try {
      await publicApi.post(`/tournaments/${tournamentId}/teams/public-register/`, {
        team_name: teamName,
        player_names: validPlayers
      });
      toast.success("Team successfully registered! Welcome to the tournament.");
      navigate(`/tournament/${tournamentId}`);
    } catch (err: any) {
      const errorData = err.response?.data;
      if (typeof errorData === 'object') {
        const messages = Object.values(errorData).flat().join(" ");
        toast.error(messages || "Registration failed.");
      } else {
        toast.error("Registration failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!tournament) return null;

  return (
    <div className="min-h-screen bg-ink-950 text-white flex flex-col selection:bg-neon-cyan/30">
      <PublicNav />

      <div className="absolute inset-0 mesh-hero opacity-10 pointer-events-none" />

      <main className="relative flex-1 max-w-2xl w-full mx-auto px-6 py-12 md:py-20 z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-ink-500 hover:text-white transition mb-10 text-xs font-black uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <header className="mb-12">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-cyan/5 border border-neon-cyan/20 text-[10px] text-neon-cyan font-black uppercase tracking-widest mb-4">
              <ShieldCheck className="w-3.5 h-3.5" /> Secure Enrollment
           </div>
           <h1 className="text-4xl md:text-5xl font-black font-display tracking-tight text-white mb-3">
              Team <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-violet">Registration</span>
           </h1>
           <p className="text-ink-400 text-sm md:text-base font-medium leading-relaxed">
              Enlisting for <span className="text-white font-bold">{tournament.name}</span>. Fill in your squad details to secure your spot in the bracket.
           </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-10 animate-rise">
           
           {/* Section 1: Team Identity */}
           <section className="glass rounded-[2rem] p-8 border border-white/[.06] shadow-panel space-y-6">
              <div className="flex items-center gap-3 mb-2">
                 <Trophy className="w-5 h-5 text-neon-amber" />
                 <h2 className="text-xs font-black uppercase tracking-[.25em] text-ink-300">Team Identity</h2>
              </div>
              <div className="space-y-2">
                 <label className="block text-[10px] uppercase font-bold text-ink-500 ml-1">Official Team Name</label>
                 <input 
                   required
                   value={teamName}
                   onChange={(e) => setTeamName(e.target.value)}
                   placeholder="e.g. Street Warriors XI"
                   className="w-full bg-ink-900 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 placeholder:text-ink-700 transition-all font-bold"
                 />
              </div>
           </section>

           {/* Section 2: Squad List */}
           <section className="glass rounded-[2rem] p-8 border border-white/[.06] shadow-panel space-y-8">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-neon-cyan" />
                    <h2 className="text-xs font-black uppercase tracking-[.25em] text-ink-300">Squad Roster</h2>
                 </div>
                 <span className="text-[10px] font-bold text-ink-600 uppercase bg-white/5 px-2.5 py-1 rounded-lg">
                    {players.length} / {tournament.players_per_team} Limit
                 </span>
              </div>

              <div className="space-y-3">
                 {players.map((name, index) => (
                   <div key={index} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                      <div className="flex-1 relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                           <span className="text-[10px] font-mono text-ink-700 group-focus-within:text-neon-cyan transition-colors">{String(index + 1).padStart(2, '0')}</span>
                        </div>
                        <input 
                          required
                          value={name}
                          onChange={(e) => updatePlayerName(index, e.target.value)}
                          placeholder={`Enter player name...`}
                          className="w-full bg-ink-950 border border-white/5 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-white/20 transition-all font-medium placeholder:text-ink-800"
                        />
                      </div>
                      {players.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removePlayerField(index)}
                          className="p-3.5 rounded-xl bg-rose-500/5 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/20"
                        >
                           <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                   </div>
                 ))}
              </div>

              <button 
                type="button" 
                onClick={addPlayerField}
                className="w-full h-14 rounded-2xl border-2 border-dashed border-white/10 text-ink-500 hover:text-neon-cyan hover:border-neon-cyan/40 hover:bg-neon-cyan/5 transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest"
              >
                 <UserPlus className="w-4 h-4" /> Add Next Player
              </button>
           </section>

           {/* Submit Button */}
           <div className="pt-6">
              <button 
                type="submit" 
                disabled={submitting}
                className="w-full h-16 rounded-[2.5rem] bg-neon-cyan text-ink-950 hover:bg-cyan-400 font-black uppercase tracking-[.3em] text-xs transition-all shadow-glow-cyan/40 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
              >
                 {submitting ? (
                   <>
                     <Zap className="w-5 h-5 animate-spin" /> Processing Protocols...
                   </>
                 ) : (
                   <>
                     <Send className="w-5 h-5" /> Confirm Registration
                   </>
                 )}
              </button>
              <p className="text-[10px] text-center text-ink-600 mt-6 font-bold uppercase tracking-widest opacity-60">
                 By registering, you agree to follow the tournament protocols and fair play guidelines.
              </p>
           </div>

        </form>
      </main>
    </div>
  );
}

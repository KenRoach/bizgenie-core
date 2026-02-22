import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated", description: "You can now sign in with your new password." });
      navigate("/auth");
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background kitz-grid-bg">
        <p className="text-muted-foreground text-sm">Invalid or expired reset link.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background kitz-grid-bg p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Zap className="w-6 h-6 text-primary" />
            <span className="font-mono font-bold text-xl tracking-wider text-foreground">workspace.kitz.services</span>
          </div>
          <p className="text-sm text-muted-foreground">Set your new password</p>
        </div>
        <div className="bg-card border border-border rounded-md p-6">
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Min 6 characters" className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

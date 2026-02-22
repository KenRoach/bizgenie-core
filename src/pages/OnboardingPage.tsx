import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/hooks/useBusiness";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight, Plus, Copy, MessageCircle, PartyPopper, Check } from "lucide-react";
import confetti from "canvas-confetti";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkAmount, setLinkAmount] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [createdLinkId, setCreatedLinkId] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const progressValue = step === 1 ? 33 : step === 2 ? 66 : 100;
  const stepLabels = ["Business", "Product", "Checkout Link"];

  // Step 1: Create business
  const handleCreateBusiness = async () => {
    if (!businessName.trim() || !user) return;
    setLoading(true);

    // Check if business already exists for this user
    const { data: existing } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (existing) {
      // Update existing
      await supabase
        .from("businesses")
        .update({ name: businessName.trim() })
        .eq("id", existing.id);
      setBusinessId(existing.id);
    } else {
      const { data, error } = await supabase
        .from("businesses")
        .insert({ name: businessName.trim(), owner_id: user.id })
        .select("id")
        .single();
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      setBusinessId(data.id);
    }

    setLoading(false);
    setStep(2);
  };

  // Step 2: Add product
  const handleAddProduct = async () => {
    if (!productName.trim() || !productPrice || !businessId) return;
    setLoading(true);

    const price = parseFloat(productPrice);
    if (isNaN(price) || price <= 0) {
      toast({ title: "Invalid price", description: "Enter a valid price.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        business_id: businessId,
        name: productName.trim(),
        price,
        description: productDesc.trim() || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const newProduct: Product = { id: data.id, name: data.name, price: data.price, description: data.description || "" };
    setProducts((prev) => [...prev, newProduct]);

    // Pre-fill step 3 with first product
    if (products.length === 0) {
      setLinkTitle(newProduct.name);
      setLinkAmount(String(newProduct.price));
    }

    // Reset form
    setProductName("");
    setProductPrice("");
    setProductDesc("");
    setLoading(false);

    toast({ title: "Product added!", description: `${newProduct.name} — $${newProduct.price}` });
  };

  // Step 3: Create checkout link
  const handleCreateLink = async () => {
    if (!linkTitle.trim() || !linkAmount || !businessId) return;
    setLoading(true);

    const amount = parseFloat(linkAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("checkout_links")
      .insert({
        business_id: businessId,
        title: linkTitle.trim(),
        amount,
        buyer_name: buyerName.trim() || null,
        buyer_phone: buyerPhone.trim() || null,
        buyer_email: buyerEmail.trim() || null,
        status: "active",
      })
      .select("id")
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Mark onboarding complete
    await supabase.from("businesses").update({ onboarding_completed: true } as any).eq("id", businessId);

    setCreatedLinkId(data.id);
    setLoading(false);

    // Confetti!
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  };

  const shareUrl = `${window.location.origin}/s/${createdLinkId}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Link copied!" });
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(`Check out this link: ${shareUrl}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-8">
        <Zap className="w-5 h-5 text-primary" />
        <span className="font-mono font-bold text-lg tracking-wider text-foreground">kitz</span>
      </div>

      {/* Progress */}
      <div className="w-full max-w-md mb-2">
        <div className="flex justify-between text-xs font-mono text-muted-foreground mb-2">
          {stepLabels.map((label, i) => (
            <span key={label} className={step > i ? "text-primary" : step === i + 1 ? "text-foreground" : ""}>
              {i + 1}. {label}
            </span>
          ))}
        </div>
        <Progress value={progressValue} className="h-1.5" />
      </div>

      {/* Steps */}
      <div className="w-full max-w-md mt-8">
        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">What's your business called?</h1>
              <p className="text-sm text-muted-foreground">We'll use this on your checkout pages.</p>
            </div>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Maria's Empanadas"
              className="text-lg h-12"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && businessName.trim() && handleCreateBusiness()}
            />
            <Button onClick={handleCreateBusiness} disabled={!businessName.trim() || loading} className="w-full h-11 gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">Add your first product</h1>
              <p className="text-sm text-muted-foreground">What are you selling?</p>
            </div>

            {products.length > 0 && (
              <div className="space-y-2">
                {products.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm">
                    <span className="text-foreground font-medium">{p.name}</span>
                    <span className="text-muted-foreground">${p.price}</span>
                  </div>
                ))}
                <p className="text-xs text-primary font-medium">¡Casi listo!</p>
              </div>
            )}

            <div className="space-y-3">
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product name" autoFocus />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="0.00" type="number" min="0" step="0.01" className="pl-7" />
              </div>
              <Textarea value={productDesc} onChange={(e) => setProductDesc(e.target.value)} placeholder="Description (optional)" rows={2} />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleAddProduct} disabled={!productName.trim() || !productPrice || loading} className="flex-1 gap-1">
                <Plus className="w-4 h-4" /> Add Product
              </Button>
              <Button onClick={() => setStep(3)} disabled={products.length === 0} className="flex-1 gap-1">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && !createdLinkId && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">Create your first checkout link</h1>
              <p className="text-sm text-muted-foreground">Share it and get paid.</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Title</label>
                <Input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input value={linkAmount} onChange={(e) => setLinkAmount(e.target.value)} type="number" min="0" step="0.01" className="pl-7" />
                </div>
              </div>

              <div className="border-t border-border pt-3 space-y-3">
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Buyer info (optional)</p>
                <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Buyer name" />
                <Input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="Phone" />
                <Input value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} placeholder="Email" type="email" />
              </div>
            </div>

            <Button onClick={handleCreateLink} disabled={!linkTitle.trim() || !linkAmount || loading} className="w-full h-11 gap-2">
              Create Link <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* STEP 3 — Success */}
        {step === 3 && createdLinkId && (
          <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
            <PartyPopper className="w-12 h-12 text-primary mx-auto" />
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">You're all set! 🎉</h1>
              <p className="text-sm text-muted-foreground">Share your link and start getting paid.</p>
            </div>

            <div className="bg-secondary/50 border border-border rounded-md p-3">
              <p className="text-xs text-muted-foreground font-mono mb-1">Your checkout link</p>
              <p className="text-sm text-foreground font-medium break-all">{shareUrl}</p>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleCopy} className="flex-1 gap-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy Link"}
              </Button>
              <Button variant="outline" onClick={handleWhatsApp} className="flex-1 gap-2">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </Button>
            </div>

            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="w-full text-muted-foreground">
              Go to Dashboard →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

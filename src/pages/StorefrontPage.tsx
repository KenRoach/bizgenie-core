import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";

interface CheckoutLinkData {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  status: string;
  business_id: string;
}

interface BusinessData {
  name: string;
}

export default function StorefrontPage() {
  const { id } = useParams<{ id: string }>();
  const [link, setLink] = useState<CheckoutLinkData | null>(null);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      const { data: linkData } = await (supabase as any)
        .from("checkout_links")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!linkData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLink(linkData);
      setBuyerName(linkData.buyer_name || "");
      setBuyerPhone(linkData.buyer_phone || "");
      setBuyerEmail(linkData.buyer_email || "");

      const { data: bizData } = await (supabase as any)
        .from("businesses")
        .select("name")
        .eq("id", linkData.business_id)
        .maybeSingle();

      setBusiness(bizData);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handlePay = async () => {
    if (!link) return;
    setSaving(true);
    await (supabase as any)
      .from("checkout_links")
      .update({
        buyer_name: buyerName || null,
        buyer_phone: buyerPhone || null,
        buyer_email: buyerEmail || null,
        status: "sent",
      })
      .eq("id", link.id);
    setSaving(false);
    setSuccess(true);
    setLink({ ...link, status: "sent" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Link not found</h1>
          <p className="text-gray-500 mt-2 text-sm">This checkout link doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const isPaid = link?.status === "paid";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex items-start justify-center px-4 py-8 md:py-16">
        <div className="w-full max-w-md">
          {/* Business header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-lg">
                {business?.name?.charAt(0)?.toUpperCase() || "K"}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-700">{business?.name || "Business"}</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h1 className="text-xl font-semibold text-gray-900">{link?.title}</h1>
              {link?.description && (
                <p className="text-sm text-gray-500 mt-1">{link.description}</p>
              )}
              <div className="mt-4">
                <span className="text-3xl font-bold text-gray-900">
                  ${Number(link?.amount || 0).toFixed(2)}
                </span>
                <span className="text-sm text-gray-400 ml-1">USD</span>
              </div>
            </div>

            {isPaid ? (
              <div className="p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h2 className="text-lg font-semibold text-gray-900">Payment Received</h2>
                <p className="text-sm text-gray-500 mt-1">Thank you for your payment!</p>
              </div>
            ) : success ? (
              <div className="p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h2 className="text-lg font-semibold text-gray-900">Details Submitted</h2>
                <p className="text-sm text-gray-500 mt-1">Your information has been saved. The seller will follow up shortly.</p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Your Name</label>
                  <input
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handlePay}
                  disabled={saving}
                  className="w-full py-3 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Pay ${Number(link?.amount || 0).toFixed(2)}
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6">
            Powered by{" "}
            <a href="https://kitz.services" className="underline hover:text-gray-600" target="_blank" rel="noopener noreferrer">
              kitz.services
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

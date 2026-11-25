import React, { useEffect, useState } from "react";
import { Send, Star, ThumbsUp, Trash2 } from "lucide-react";

import { apiRequest } from "../lib/api";

interface FeedbackItem {
  id: number;
  author_name: string;
  rating: number;
  category: string;
  message: string;
  status: string;
  upvotes: number;
  upvoted_by_me: boolean;
  is_mine?: boolean;
  created_at: string;
}

export const FeedbackPage: React.FC = () => {
  const [entries, setEntries] = useState<FeedbackItem[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [filterCat, setFilterCat] = useState("All");
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState<"Feature" | "Bug" | "General">("Feature");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    const data = await apiRequest<{ average_rating: number; entries: FeedbackItem[] }>("/api/feedback");
    setEntries(data.entries);
    setAvgRating(data.average_rating);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    const res = await apiRequest<{ message: string }>("/api/feedback", {
      method: "POST",
      body: JSON.stringify({ rating, category, message }),
    });
    setMessage("");
    setNotice(res.message);
    load();
  };

  const toggleUpvote = async (id: number) => {
    await apiRequest(`/api/feedback/${id}/upvote`, { method: "POST" });
    load();
  };

  const deleteOwn = async (id: number) => {
    await apiRequest(`/api/feedback/${id}`, { method: "DELETE" });
    load();
  };

  const visible = filterCat === "All" ? entries : entries.filter((e) => e.category === filterCat);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "1.65rem" }}>Feedback &amp; Community Ideas</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Submit feature ideas, report bugs, filter by category, and upvote community suggestions.
          </p>
        </div>
        <span className="badge badge-amber" style={{ padding: "8px 14px", fontSize: "0.9rem" }}>
          <Star size={15} fill="#eab308" color="#eab308" /> {avgRating.toFixed(1)} / 5.0 Rating
        </span>
      </div>

      {notice && (
        <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 14px", borderRadius: 10, marginBottom: 16, fontWeight: 600 }}>
          {notice}
        </div>
      )}

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="card">
          <h3 style={{ fontSize: "1.08rem", marginBottom: 14 }}>Submit Feedback</h3>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 6 }}>Rating</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} className="icon-btn" aria-label={`Rate ${n} stars`}>
                    <Star size={18} fill={n <= rating ? "#facc15" : "none"} color={n <= rating ? "#eab308" : "var(--text-muted)"} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 6 }}>Category</label>
              <select className="select" value={category} onChange={(e) => setCategory(e.target.value as "Feature" | "Bug" | "General")}>
                <option value="Feature">Feature Request</option><option value="Bug">Bug Report</option><option value="General">General Feedback</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 6 }}>Details</label>
              <textarea className="textarea" rows={4} required placeholder="Share your idea or report an issue..." value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-gradient"><Send size={15} /> Submit Feedback</button>
          </form>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <h3 style={{ fontSize: "1.08rem" }}>Community Board ({visible.length})</h3>
            <div style={{ display: "flex", gap: 6 }}>
              {["All", "Feature", "Bug", "General"].map((c) => (
                <button key={c} className={`btn btn-sm ${filterCat === c ? "btn-gradient" : "btn-soft"}`} onClick={() => setFilterCat(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {visible.map((item) => (
              <div key={item.id} style={{ padding: 14, borderRadius: 12, background: "var(--bg-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <strong>{item.author_name}</strong>
                    <span className="badge badge-purple">{item.category}</span>
                    <span className="badge badge-blue">{item.status}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button className={`btn btn-sm ${item.upvoted_by_me ? "btn-gradient" : "btn-white"}`} onClick={() => toggleUpvote(item.id)}>
                      <ThumbsUp size={13} /> {item.upvotes}
                    </button>
                    {item.is_mine && (
                      <button className="icon-btn" onClick={() => deleteOwn(item.id)} aria-label="Delete feedback">
                        <Trash2 size={14} color="#dc2626" />
                      </button>
                    )}
                  </div>
                </div>
                <p style={{ margin: "4px 0 6px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>{item.message}</p>
                <div style={{ fontSize: "0.78rem", color: "#ca8a04" }}>{"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

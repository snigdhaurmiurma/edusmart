import React, { useState } from "react";
import { Download, KeyRound, Save, ShieldCheck } from "lucide-react";

import { apiRequest, downloadWithAuth } from "../lib/api";
import type { User } from "../types";

interface ProfilePageProps {
  user: User;
  onUserUpdated: (u: User) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUserUpdated }) => {
  const [fullName, setFullName] = useState(user.full_name);
  const [studentId, setStudentId] = useState(user.student_id || "");
  const [major, setMajor] = useState(user.major);
  const [trimester, setTrimester] = useState(user.trimester);
  const [credits, setCredits] = useState(user.credits_completed);
  const [consentRag, setConsentRag] = useState(user.consent_rag_personal);
  const [consentOcr, setConsentOcr] = useState(user.consent_ocr_processing);
  const [consentSync, setConsentSync] = useState(user.consent_ucam_sync);
  const [emailNotifs, setEmailNotifs] = useState(user.email_notifications);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    try {
      const updated = await apiRequest<User>("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify({
          full_name: fullName,
          student_id: studentId,
          major,
          trimester,
          credits_completed: credits,
          consent_rag_personal: consentRag,
          consent_ocr_processing: consentOcr,
          consent_ucam_sync: consentSync,
          email_notifications: emailNotifs,
        }),
      });
      onUserUpdated(updated);
      setSavedMsg("Profile and privacy consent settings saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    setPwErr(null);
    try {
      const res = await apiRequest<{ message: string }>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: curPw, new_password: newPw }),
      });
      setPwMsg(res.message);
      setCurPw("");
      setNewPw("");
    } catch (err) {
      setPwErr(err instanceof Error ? err.message : "Failed to update password.");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.65rem" }}>Profile, Security &amp; Privacy Controls</h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Manage your academic context, change your password, control RAG permissions, and export a GDPR JSON archive.
        </p>
      </div>

      {savedMsg && (
        <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 14px", borderRadius: 10, marginBottom: 16, fontWeight: 600 }}>
          {savedMsg}
        </div>
      )}

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <form onSubmit={handleSave} className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ fontSize: "1.08rem" }}>Academic Profile</h3>
            <div><label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Full Name</label><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
            <div><label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Student ID</label><input className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)} /></div>
            <div><label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Major / Department</label><input className="input" value={major} onChange={(e) => setMajor(e.target.value)} /></div>
            <div className="grid-2">
              <div><label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Term</label><input className="input" value={trimester} onChange={(e) => setTrimester(e.target.value)} /></div>
              <div><label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Credits Completed</label><input className="input" type="number" value={credits} onChange={(e) => setCredits(Number(e.target.value))} /></div>
            </div>
            <button type="submit" className="btn btn-gradient" disabled={saving}><Save size={16} /> {saving ? "Saving..." : "Save Profile & Consent"}</button>
          </form>

          <form onSubmit={handleChangePassword} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <KeyRound size={18} color="var(--brand-purple)" />
              <h3 style={{ fontSize: "1.05rem" }}>Change Password</h3>
            </div>
            {pwMsg && <div style={{ background: "#dcfce7", color: "#166534", padding: "8px 12px", borderRadius: 8, fontSize: "0.84rem" }}>{pwMsg}</div>}
            {pwErr && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "8px 12px", borderRadius: 8, fontSize: "0.84rem" }}>{pwErr}</div>}
            <input className="input" type="password" required placeholder="Current password" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
            <input className="input" type="password" required placeholder="New password (8+ chars, letters & numbers)" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            <button type="submit" className="btn btn-white btn-sm">Update Password</button>
          </form>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={20} color="var(--brand-purple)" />
              <h3 style={{ fontSize: "1.08rem" }}>AI &amp; Data Consent</h3>
            </div>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div><strong>Personal Notes in RAG Retrieval</strong><div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Allow chatbots to cite your own uploaded notes (strictly isolated).</div></div>
              <input type="checkbox" checked={consentRag} onChange={(e) => setConsentRag(e.target.checked)} />
            </label>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div><strong>Handwritten OCR Processing</strong><div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Permit uploaded lecture photos and PDFs to be digitized.</div></div>
              <input type="checkbox" checked={consentOcr} onChange={(e) => setConsentOcr(e.target.checked)} />
            </label>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div><strong>UCAM &amp; ELMS Sync</strong><div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Allow read-only import of courses and deadlines.</div></div>
              <input type="checkbox" checked={consentSync} onChange={(e) => setConsentSync(e.target.checked)} />
            </label>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div><strong>Email Reminder Digests</strong><div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Receive deadline reminders and weekly study summaries.</div></div>
              <input type="checkbox" checked={emailNotifs} onChange={(e) => setEmailNotifs(e.target.checked)} />
            </label>
            <button type="button" className="btn btn-soft btn-sm" onClick={handleSave} disabled={saving}>Apply Consent Settings</button>
          </div>

          <div className="card">
            <h3 style={{ fontSize: "1.05rem", marginBottom: 8 }}>GDPR Data Portability</h3>
            <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", marginTop: 0 }}>
              Download a complete machine-readable JSON archive of your profile, digitized notes, calendar events, and quiz attempts.
            </p>
            <button type="button" className="btn btn-white" onClick={() => downloadWithAuth("/api/auth/export", "edusmart-my-data.json")}>
              <Download size={16} /> Export Personal Data (JSON)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

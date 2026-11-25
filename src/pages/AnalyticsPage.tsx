import React, { useEffect, useState } from "react";
import { Download, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { apiRequest, downloadWithAuth } from "../lib/api";

interface AnalyticsData {
  kpis: {
    notes_digitized: number;
    avg_quiz_score: number;
    routine_adherence: number;
    upcoming_deadlines: number;
    ai_sessions: number;
    study_streak_days: number;
  };
  weekly_study: { day: string; hours: number; quizzes: number; tasks: number }[];
  topic_mastery: { topic: string; mastery: number; attempts: number }[];
  weak_areas: { topic: string; mastery: number; attempts: number }[];
  quiz_trend: { label: string; score: number; date: string }[];
  recommendations: string[];
}

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    apiRequest<AnalyticsData>("/api/analytics/overview").then(setData).catch(() => {});
  }, []);

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "1.65rem" }}>Student Study Analytics</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Track weekly study hours, quiz accuracy trends, topic mastery, and export personal progress reports.
          </p>
        </div>
        <button
          className="btn btn-white"
          onClick={() => downloadWithAuth("/api/analytics/export.csv", "edusmart-study-report.csv")}
        >
          <Download size={16} /> Export CSV Report
        </button>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3 style={{ fontSize: "1.05rem", marginBottom: 14 }}>Weekly Study Hours</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.weekly_study || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="day" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip />
                <Bar dataKey="hours" fill="#7b2ff7" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: "1.05rem", marginBottom: 14 }}>Quiz Score Progression (%)</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.quiz_trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="label" stroke="var(--text-muted)" />
                <YAxis domain={[0, 100]} stroke="var(--text-muted)" />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#e000a8" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontSize: "1.05rem", marginBottom: 14 }}>Topic Mastery Breakdown</h3>
          {data?.topic_mastery.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.topic_mastery.map((item) => (
                <div key={item.topic}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: 4 }}>
                    <strong>{item.topic}</strong>
                    <span>{item.mastery}%</span>
                  </div>
                  <div style={{ height: 9, borderRadius: 999, background: "var(--bg-subtle)", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${item.mastery}%`,
                        height: "100%",
                        background: item.mastery >= 75 ? "#22c55e" : item.mastery >= 55 ? "#eab308" : "#ef4444",
                        borderRadius: 999,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)" }}>Complete a practice quiz to unlock topic mastery insights.</p>
          )}
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <TrendingUp size={18} color="var(--brand-purple)" />
            <h3 style={{ fontSize: "1.05rem" }}>Targeted Study Recommendations</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data?.recommendations.map((r, i) => (
              <div key={i} style={{ padding: 12, borderRadius: 10, background: "var(--bg-subtle)", fontSize: "0.9rem" }}>
                {r}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

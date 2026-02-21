"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

const MOODS = [
  { rating: 1, emoji: "😢", label: "Struggling", color: "text-red-400", bg: "bg-red-900/40 border-red-700" },
  { rating: 2, emoji: "😕", label: "Rough day", color: "text-orange-400", bg: "bg-orange-900/40 border-orange-700" },
  { rating: 3, emoji: "😐", label: "Okay", color: "text-yellow-400", bg: "bg-yellow-900/40 border-yellow-700" },
  { rating: 4, emoji: "🙂", label: "Pretty good", color: "text-green-400", bg: "bg-green-900/40 border-green-700" },
  { rating: 5, emoji: "😄", label: "Doing great", color: "text-emerald-400", bg: "bg-emerald-900/40 border-emerald-700" },
];

interface WellnessCheckInProps {
  onComplete: () => void;
}

export function WellnessCheckIn({ onComplete }: WellnessCheckInProps) {
  const utils = trpc.useUtils();
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const mutation = trpc.wellness.checkIn.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      utils.wellness.getDailyStatus.invalidate();
      utils.wellness.getMyHistory.invalidate();
      // Dismiss after a short delay
      setTimeout(() => {
        onComplete();
      }, 1800);
    },
  });

  const selectedMood = MOODS.find((m) => m.rating === selectedRating);

  if (submitted) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 text-center">
        <div className="text-4xl mb-2">{selectedMood?.emoji}</div>
        <p className="text-lg font-semibold text-white">Checked in!</p>
        <p className="text-sm text-zinc-400 mt-1">
          {selectedRating && selectedRating >= 4
            ? "Keep it up — you're doing amazing."
            : selectedRating === 3
            ? "One day at a time. You've got this."
            : "Thank you for sharing. Reach out if you need support."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">How are you feeling today?</h2>
        <p className="text-sm text-zinc-400 mt-1">Take a moment to check in with yourself.</p>
      </div>

      {/* Emoji row */}
      <div className="flex justify-between gap-2 mb-4">
        {MOODS.map((mood) => (
          <button
            key={mood.rating}
            onClick={() => setSelectedRating(mood.rating)}
            className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all duration-150 ${
              selectedRating === mood.rating
                ? `${mood.bg} scale-110 shadow-lg`
                : "border-zinc-700 bg-zinc-800 hover:border-zinc-500"
            }`}
          >
            <span className="text-3xl leading-none">{mood.emoji}</span>
            <span className={`text-xs font-medium ${selectedRating === mood.rating ? mood.color : "text-zinc-400"}`}>
              {mood.label}
            </span>
          </button>
        ))}
      </div>

      {/* Note toggle */}
      {selectedRating && !showNote && (
        <button
          onClick={() => setShowNote(true)}
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-4 underline underline-offset-2"
        >
          Want to share more?
        </button>
      )}

      {showNote && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything on your mind? (optional)"
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-4 placeholder-zinc-500"
        />
      )}

      {/* Submit */}
      <button
        onClick={() => {
          if (!selectedRating) return;
          mutation.mutate({ moodRating: selectedRating, note: note || undefined });
        }}
        disabled={!selectedRating || mutation.isPending}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
      >
        {mutation.isPending ? "Saving..." : "Submit Check-in"}
      </button>

      {mutation.isError && (
        <p className="text-xs text-red-400 mt-2 text-center">{mutation.error.message}</p>
      )}
    </div>
  );
}

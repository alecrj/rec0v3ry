"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

const MOODS = [
  { rating: 1, emoji: "😢", label: "Struggling", color: "text-red-600", bg: "bg-red-50 border-red-200" },
  { rating: 2, emoji: "😕", label: "Rough day", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  { rating: 3, emoji: "😐", label: "Okay", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  { rating: 4, emoji: "🙂", label: "Pretty good", color: "text-green-600", bg: "bg-green-50 border-green-200" },
  { rating: 5, emoji: "😄", label: "Doing great", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
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
      <div className="bg-white border border-zinc-200 rounded-xl p-6 text-center">
        <div className="text-4xl mb-2">{selectedMood?.emoji}</div>
        <p className="text-lg font-semibold text-zinc-900">Checked in!</p>
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
    <div className="bg-white border border-zinc-200 rounded-xl p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-zinc-900">How are you feeling today?</h2>
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
                : "border-zinc-200 bg-zinc-100 hover:border-zinc-400"
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
          className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors mb-4 underline underline-offset-2"
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
          className="w-full px-3 py-2 bg-zinc-100 border border-zinc-300 text-zinc-900 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] resize-none mb-4 placeholder-zinc-500"
        />
      )}

      {/* Submit */}
      <button
        onClick={() => {
          if (!selectedRating) return;
          mutation.mutate({ moodRating: selectedRating, note: note || undefined });
        }}
        disabled={!selectedRating || mutation.isPending}
        className="w-full py-3 bg-[#0d9488] hover:bg-[#0f766e] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
      >
        {mutation.isPending ? "Saving..." : "Submit Check-in"}
      </button>

      {mutation.isError && (
        <p className="text-xs text-red-400 mt-2 text-center">{mutation.error.message}</p>
      )}
    </div>
  );
}

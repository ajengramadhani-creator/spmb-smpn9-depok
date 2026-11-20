"use client";

type Props = {
  state: { status: "success" | "error"; message: string } | null;
};

export function ActionFeedback({ state }: Props) {
  if (!state) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={`rounded-lg px-3 py-2.5 text-sm ${state.status === "error" ? "bg-red-50 text-danger" : "bg-emerald-50 text-emerald-800"}`}
    >
      {state.message}
    </p>
  );
}

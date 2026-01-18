import { Suspense } from "react";
import QuizClient from "./QuizClient";
import Loading from "@/app/components/Loading";

export default function QuizPageWrapper() {
  return (
    <Suspense fallback={<Loading text="Loading quiz..." />}>
      <QuizClient />
    </Suspense>
  );
}

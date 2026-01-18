import { Suspense } from "react";
import QuizResults from "./resultsComponent";
import Loading from "@/app/components/Loading";

export default function QuizPageWrapper() {
  return (
    <Suspense fallback={<Loading text="Loading results..." />}>
      <QuizResults />
    </Suspense>
  );
}

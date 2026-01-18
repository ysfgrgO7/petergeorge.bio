import { Suspense } from "react";
import QuizClient from "./HwBuilder";
import Loading from "@/app/components/Loading";

export default function QuizPage() {
  return (
    <Suspense fallback={<Loading text="Loading quiz builder..." />}>
      <QuizClient />
    </Suspense>
  );
}

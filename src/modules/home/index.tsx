import { useEffect, useState } from "react";
import { useFirstName } from "../../app/store/useAccountStore";
import { spacesRepo } from "../../db/repositories/spacesRepo";
import { OnboardingView } from "./onboarding/OnboardingView";
import { DashboardView } from "./DashboardView";

type LoadState = { status: "loading" } | { status: "error" } | { status: "empty" } | { status: "ready" };

export default function Home() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const firstName = useFirstName();

  function checkSpaces() {
    spacesRepo
      .list()
      .then((spaces) => setState({ status: spaces.length === 0 ? "empty" : "ready" }))
      .catch(() => setState({ status: "error" }));
  }

  useEffect(checkSpaces, []);

  if (state.status === "loading") {
    return <div className="h-full" />;
  }

  if (state.status === "error") {
    return (
      <div className="flex h-full items-center justify-center px-10 py-8">
        <p className="text-[14px] text-(--color-ink-muted)">
          Não foi possível carregar seus dados locais.
        </p>
      </div>
    );
  }

  if (state.status === "empty") {
    return <OnboardingView name={firstName} onSpaceCreated={checkSpaces} />;
  }

  return <DashboardView />;
}

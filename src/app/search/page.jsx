import SearchClient from "./SearchClient";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense>
      <SearchClient />
    </Suspense>
  );
}

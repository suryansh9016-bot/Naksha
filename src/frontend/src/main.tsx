import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import { InternetIdentityProvider } from "./hooks/useInternetIdentity";
import "./index.css";
import { waitForBridge } from "./utils/nativeBridge";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

const queryClient = new QueryClient();

/**
 * Native-to-Web Handshake — CRITICAL
 *
 * Wait for the Capacitor bridge to be fully initialised before
 * mounting React. On web this resolves immediately (<1ms).
 * On native Android this waits for the 'pluginsready' event,
 * preventing 'Could not write' and filesystem errors on cold launch.
 */
waitForBridge().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
      <InternetIdentityProvider>
        <App />
      </InternetIdentityProvider>
    </QueryClientProvider>,
  );
});

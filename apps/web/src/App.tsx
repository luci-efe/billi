import { Routes, Route, Navigate } from "react-router";
import { SignedIn, SignedOut, SignIn, SignUp } from "@clerk/clerk-react";
import RootLayout from "./routes/root";
import Dashboard from "./routes/dashboard";
import Transactions from "./routes/transactions";
import Chat from "./routes/chat";
import Landing from "./routes/landing";
import Invoices from "./routes/invoices";
import Settings from "./routes/settings";

function App() {
  return (
    <Routes>
      {/* Public Landing page */}
      <Route path="/landing" element={<Landing />} />
      
      {/* Auth routes */}
      <Route
        path="/sign-in/*"
        element={
          <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
            <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
          </div>
        }
      />
      <Route
        path="/sign-up/*"
        element={
          <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
            <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
          </div>
        }
      />

      {/* Protected routes (inside main layout) */}
      <Route
        path="/"
        element={
          <>
            <SignedIn>
              <RootLayout />
            </SignedIn>
            <SignedOut>
              <Navigate to="/landing" replace />
            </SignedOut>
          </>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="chat" element={<Chat />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

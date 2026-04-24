import { BrowserRouter, Routes, Route } from "react-router";
import RootLayout from "./routes/root";
import Dashboard from "./routes/dashboard";
import Transactions from "./routes/transactions";
import Chat from "./routes/chat";
import Landing from "./routes/landing";
import Invoices from "./routes/invoices";
import Settings from "./routes/settings";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page (outside main layout) */}
        <Route path="/landing" element={<Landing />} />
        
        {/* Protected routes (inside main layout) */}
        <Route path="/" element={<RootLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="chat" element={<Chat />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toaster position="top-right" theme="dark" />
    </BrowserRouter>
  );
}

export default App;

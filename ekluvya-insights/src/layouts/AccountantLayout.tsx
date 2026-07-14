import { Outlet } from "react-router-dom";
import AccountantSidebar from "@/components/AccountantSidebar";

const AccountantLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <AccountantSidebar />
      <div className="min-h-screen lg:pl-72">
        <Outlet />
      </div>
    </div>
  );
};

export default AccountantLayout;

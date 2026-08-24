import { Outlet } from "react-router-dom";
import AccountantSidebar from "@/components/AccountantSidebar";

const AccountantLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <AccountantSidebar />
      <div className="min-h-screen transition-[padding] duration-300 ease-in-out lg:pl-20">
        <Outlet />
      </div>
    </div>
  );
};

export default AccountantLayout;

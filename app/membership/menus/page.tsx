import { MembershipRouteGuard } from "@/components/membership/authorization";
import MenuManagement from "@/components/membership/MenuManagement";

export default function MembershipMenusPage() {
  return (
    <MembershipRouteGuard permission="menu.read">
      <MenuManagement />
    </MembershipRouteGuard>
  );
}

import { useState } from "react";
import { Trash2, Search, Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useGetAdminNotifications,
  useMarkAdminNotificationsRead,
  useGetNotificationLogs,
  useDeleteNotificationLog,
  useBulkDeleteNotificationLogs,
} from "../lib/api-client";

export default function NotificationListPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"admin" | "user">("admin");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);

  const { data: adminRes, isLoading: adminLoading } = useGetAdminNotifications();
  const markRead = useMarkAdminNotificationsRead();
  const { data: logsData, isLoading: logsLoading } = useGetNotificationLogs({
    page: 1,
    limit: 100,
    type: typeFilter === "all" ? undefined : typeFilter,
  });
  const deleteMutation = useDeleteNotificationLog();
  const bulkDeleteMutation = useBulkDeleteNotificationLogs();

  const adminNotifications = (adminRes?.data || []).map((n: any) => ({
    id: n._id || n.id,
    type: n.type || "system",
    title: n.title,
    text: n.message || n.text || "",
    userName: n.modelName || "System",
    userEmail: n.action || "",
    updatedAt: n.createdAt || n.updatedAt,
    isRead: !!n.isRead,
  }));

  const userNotifications = (logsData?.data || []).map((n: any) => ({
    id: n.id || n._id,
    type: n.type,
    title: n.title,
    text: n.text || n.body || "",
    userName: n.userName || "All users",
    userEmail: n.userEmail || "",
    updatedAt: n.updatedAt || n.createdAt,
    isRead: true,
  }));

  const source = tab === "admin" ? adminNotifications : userNotifications;
  const isLoading = tab === "admin" ? adminLoading : logsLoading;

  const filtered = source.filter((n) => {
    const matchType = typeFilter === "all" || n.type === typeFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      n.title?.toLowerCase().includes(q) ||
      n.type?.toLowerCase().includes(q) ||
      n.text?.toLowerCase().includes(q) ||
      n.userName?.toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  const allSelected = filtered.length > 0 && filtered.every((n) => selectedIds.includes(n.id));
  const toggleSelectAll = () => setSelectedIds(allSelected ? [] : filtered.map((n) => n.id));
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleApply = async () => {
    if (!bulkAction || selectedIds.length === 0) {
      toast({ title: "Select items and an action first", variant: "destructive" });
      return;
    }
    if (bulkAction === "delete" && tab === "user") {
      try {
        await bulkDeleteMutation.mutateAsync(selectedIds);
        setSelectedIds([]);
        toast({ title: `${selectedIds.length} notification(s) deleted` });
      } catch {
        toast({ title: "Bulk delete failed", variant: "destructive" });
      }
    }
    if (bulkAction === "read" && tab === "admin") {
      await markRead.mutateAsync();
      toast({ title: "All marked as read" });
    }
    setBulkAction("");
  };

  const handleDelete = async () => {
    if (!confirmDelete || tab !== "user") return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      setSelectedIds((prev) => prev.filter((id) => id !== confirmDelete.id));
      toast({ title: "Notification deleted" });
      setConfirmDelete(null);
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/65">Dashboard</span>
        <span>/</span>
        <span className="text-foreground font-medium">Notification List</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => { setTab("admin"); setSelectedIds([]); }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            tab === "admin" ? "bg-primary text-black" : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Admin activity ({adminNotifications.length})
        </button>
        <button
          onClick={() => { setTab("user"); setSelectedIds([]); }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            tab === "user" ? "bg-primary text-black" : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          User broadcasts ({userNotifications.length})
        </button>
        {tab === "admin" && (
          <Button
            variant="outline"
            className="ml-auto rounded-xl"
            onClick={() => markRead.mutate()}
            disabled={markRead.isPending}
          >
            <Check className="h-4 w-4 mr-1.5" /> Mark all read
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={bulkAction} onValueChange={setBulkAction}>
          <SelectTrigger className="w-40 bg-card border-border text-foreground h-10 rounded-xl">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent className="bg-muted border-border text-foreground">
            {tab === "user" && <SelectItem value="delete">Delete</SelectItem>}
            {tab === "admin" && <SelectItem value="read">Mark read</SelectItem>}
          </SelectContent>
        </Select>
        <Button onClick={handleApply} className="bg-primary hover:bg-primary/90 text-black h-10 px-5 rounded-xl font-semibold">
          Apply
        </Button>

        <div className="flex-1" />

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44 bg-card border-border text-foreground h-10 rounded-xl">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent className="bg-muted border-border text-foreground">
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="user_registered">User Registered</SelectItem>
            <SelectItem value="content_created">Created</SelectItem>
            <SelectItem value="content_updated">Updated</SelectItem>
            <SelectItem value="content_deleted">Deleted</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="broadcast">Broadcast</SelectItem>
            <SelectItem value="announcement">Announcement</SelectItem>
            <SelectItem value="promo">Promo</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-52 bg-card border-border text-foreground h-10 rounded-xl"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-card hover:bg-card">
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
              </TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Type</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Notification</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Meta</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm whitespace-nowrap">When</TableHead>
              {tab === "user" && <TableHead className="text-foreground/70 font-semibold text-sm">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-foreground/65 py-10">Loading…</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-foreground/65 py-10">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No notifications found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((n) => (
                <TableRow key={n.id} className={`border-border ${!n.isRead ? "bg-primary/5" : ""}`}>
                  <TableCell>
                    <Checkbox checked={selectedIds.includes(n.id)} onCheckedChange={() => toggleSelect(n.id)} />
                  </TableCell>
                  <TableCell className="text-xs font-semibold capitalize text-foreground">{String(n.type).replace(/_/g, " ")}</TableCell>
                  <TableCell>
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.text}</p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {n.userName}
                    {n.userEmail ? ` · ${n.userEmail}` : ""}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {n.updatedAt ? new Date(n.updatedAt).toLocaleString() : "—"}
                  </TableCell>
                  {tab === "user" && (
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setConfirmDelete(n)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete notification?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  Skeleton,
  useToast,
} from "@useroutr/ui";
import {
  useTeamMembers,
  useInviteTeamMember,
  useUpdateTeamMemberRole,
  useRemoveTeamMember,
  type TeamMember,
} from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  Trash2,
  Crown,
  Shield,
  Code,
  Receipt,
  Eye,
} from "lucide-react";

const ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "DEVELOPER", label: "Developer" },
  { value: "FINANCE", label: "Finance" },
  { value: "VIEWER", label: "Viewer" },
];

const ROLE_CONFIG: Record<
  string,
  { color: string; bg: string; border: string; icon: typeof Crown }
> = {
  OWNER: {
    color: "text-purple",
    bg: "bg-purple/10",
    border: "border-purple/20",
    icon: Crown,
  },
  ADMIN: {
    color: "text-blue",
    bg: "bg-blue/10",
    border: "border-blue/20",
    icon: Shield,
  },
  DEVELOPER: {
    color: "text-green",
    bg: "bg-green/10",
    border: "border-green/20",
    icon: Code,
  },
  FINANCE: {
    color: "text-amber",
    bg: "bg-amber/10",
    border: "border-amber/20",
    icon: Receipt,
  },
  VIEWER: {
    color: "text-muted-foreground",
    bg: "bg-secondary",
    border: "border-border",
    icon: Eye,
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.35, ease: "easeOut" },
  }),
};

export default function TeamPage() {
  const { toast } = useToast();
  const { merchant } = useAuth();
  const { data: members, isLoading: isLoadingMembers } = useTeamMembers();
  const inviteMember = useInviteTeamMember();
  const updateRole = useUpdateTeamMemberRole();
  const removeMember = useRemoveTeamMember();

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(
    null,
  );
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("DEVELOPER");
  const [newRole, setNewRole] = useState("");

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast("Please enter an email address.", "error");
      return;
    }

    inviteMember.mutate(
      { email: inviteEmail, role: inviteRole },
      {
        onSuccess: () => {
          toast("Invitation sent successfully.", "success");
          setShowInviteDialog(false);
          setInviteEmail("");
          setInviteRole("DEVELOPER");
        },
        onError: (err) =>
          toast(err.message || "Failed to send invitation.", "error"),
      },
    );
  };

  const handleChangeRole = () => {
    if (!selectedMember || !newRole) return;

    updateRole.mutate(
      { id: selectedMember.id, role: newRole },
      {
        onSuccess: () => {
          toast("Role updated successfully.", "success");
          setShowRoleDialog(false);
          setSelectedMember(null);
          setNewRole("");
        },
        onError: (err) =>
          toast(err.message || "Failed to update role.", "error"),
      },
    );
  };

  const handleRemoveMember = () => {
    if (!selectedMember) return;

    removeMember.mutate(selectedMember.id, {
      onSuccess: () => {
        toast("Member removed successfully.", "success");
        setShowRemoveDialog(false);
        setSelectedMember(null);
      },
      onError: (err) =>
        toast(err.message || "Failed to remove member.", "error"),
    });
  };

  if (isLoadingMembers) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue/10">
            <Users size={20} className="text-blue" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
              Team Members
            </h2>
            <p className="text-xs text-muted-foreground">
              {members?.length ?? 0} member{(members?.length ?? 0) !== 1 && "s"}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus size={15} />
          Invite
        </Button>
      </motion.div>

      {/* Members list */}
      <div className="space-y-2">
        {members && members.length > 0 ? (
          members.map((member, idx) => {
            const isCurrentUser = member.email === merchant?.email;
            const isOwner = member.role === "OWNER";
            const config = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.VIEWER;
            const RoleIcon = config.icon;

            return (
              <motion.div
                key={member.id}
                className="surface flex items-center justify-between p-4"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={idx + 1}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.bg}`}
                  >
                    <RoleIcon size={16} className={config.color} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {member.email}
                      </span>
                      {isCurrentUser && (
                        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          You
                        </span>
                      )}
                    </div>
                    <span
                      className={`mt-0.5 inline-flex items-center gap-1 text-xs font-medium ${config.color}`}
                    >
                      {member.role.charAt(0) +
                        member.role.slice(1).toLowerCase()}
                    </span>
                  </div>
                </div>

                {!isCurrentUser && !isOwner && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedMember(member);
                        setNewRole(member.role);
                        setShowRoleDialog(true);
                      }}
                    >
                      Change Role
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setSelectedMember(member);
                        setShowRemoveDialog(true);
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })
        ) : (
          <motion.div
            className="surface p-10 text-center"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
              <Users size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No team members yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Invite someone to get started
            </p>
          </motion.div>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Role
              </label>
              <Select
                value={inviteRole}
                onValueChange={setInviteRole}
                options={ROLES}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleInvite} loading={inviteMember.isPending}>
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update role for {selectedMember?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Role
              </label>
              <Select
                value={newRole}
                onValueChange={setNewRole}
                options={ROLES}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Changing a member&apos;s role will immediately update their
              permissions.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleChangeRole} loading={updateRole.isPending}>
              Save Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>This action cannot be undone</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove{" "}
            <strong>{selectedMember?.email}</strong> from your team? They will
            lose access immediately.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              loading={removeMember.isPending}
            >
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

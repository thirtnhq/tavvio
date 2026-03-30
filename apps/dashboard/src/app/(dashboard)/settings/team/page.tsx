"use client";

import { useState } from "react";
import { Button, Input, Modal, Select, useToast } from "@tavvio/ui";
import { api } from "@/lib/api";
import { Trash, UserPlus } from "@phosphor-icons/react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "developer" | "finance" | "viewer";
  isCurrentUser?: boolean;
}

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "developer", label: "Developer" },
  { value: "finance", label: "Finance" },
  { value: "viewer", label: "Viewer" },
];

export default function TeamPage() {
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: "1",
      name: "You",
      email: "me@co.com",
      role: "owner",
      isCurrentUser: true,
    },
    { id: "2", name: "Jane Doe", email: "j@co.com", role: "admin" },
    { id: "3", name: "Dev Smith", email: "d@co.com", role: "developer" },
  ]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("developer");
  const [newRole, setNewRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast("Please enter an email address.", "error");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/team/invite", {
        email: inviteEmail,
        role: inviteRole,
      });
      toast("Invitation sent successfully.", "success");
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("developer");
    } catch {
      toast("Failed to send invitation.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedMember || !newRole) return;

    setIsLoading(true);
    try {
      await api.patch(`/team/members/${selectedMember.id}`, {
        role: newRole,
      });
      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id
            ? { ...m, role: newRole as TeamMember["role"] }
            : m,
        ),
      );
      toast("Role updated successfully.", "success");
      setShowRoleModal(false);
      setSelectedMember(null);
      setNewRole("");
    } catch {
      toast("Failed to update role.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    setIsLoading(true);
    try {
      await api.delete(`/team/members/${selectedMember.id}`);
      setMembers((prev) => prev.filter((m) => m.id !== selectedMember.id));
      toast("Member removed successfully.", "success");
      setShowRemoveModal(false);
      setSelectedMember(null);
    } catch {
      toast("Failed to remove member.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-500/10 text-purple-500 border-purple-500/30";
      case "admin":
        return "bg-blue-500/10 text-blue-500 border-blue-500/30";
      case "developer":
        return "bg-green-500/10 text-green-500 border-green-500/30";
      case "finance":
        return "bg-orange-500/10 text-orange-500 border-orange-500/30";
      case "viewer":
        return "bg-gray-500/10 text-gray-500 border-gray-500/30";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/30";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Team Members
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage team members and their roles
          </p>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>
          <UserPlus size={16} />
          Invite Member
        </Button>
      </div>

      {/* Team members table */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">
                Role
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((member) => (
              <tr
                key={member.id}
                className="hover:bg-secondary/30 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {member.name}
                    </span>
                    {member.isCurrentUser && (
                      <span className="text-xs text-muted-foreground">
                        (You)
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {member.email}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeColor(
                      member.role,
                    )}`}
                  >
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {!member.isCurrentUser && (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(member);
                          setNewRole(member.role);
                          setShowRoleModal(true);
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
                          setShowRemoveModal(true);
                        }}
                      >
                        <Trash size={16} />
                        Remove
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      <Modal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        title="Invite Team Member"
        description="Send an invitation to join your team"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowInviteModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} loading={isLoading}>
              Send Invitation
            </Button>
          </div>
        }
      >
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
              options={ROLES.filter((r) => r.value !== "owner")}
            />
          </div>
        </div>
      </Modal>

      {/* Change Role Modal */}
      <Modal
        open={showRoleModal}
        onOpenChange={setShowRoleModal}
        title="Change Role"
        description={`Update role for ${selectedMember?.name}`}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRoleModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole} loading={isLoading}>
              Save Role
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              Role
            </label>
            <Select
              value={newRole}
              onValueChange={setNewRole}
              options={ROLES.filter((r) => r.value !== "owner")}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Changing a member's role will immediately update their permissions.
          </p>
        </div>
      </Modal>

      {/* Remove Member Modal */}
      <Modal
        open={showRemoveModal}
        onOpenChange={setShowRemoveModal}
        title="Remove Team Member"
        description="This action cannot be undone"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRemoveModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              loading={isLoading}
            >
              Remove Member
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to remove{" "}
          <strong>{selectedMember?.name}</strong> from your team? They will lose
          access to all dashboard features immediately.
        </p>
      </Modal>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, ShieldCheck, 
  Lock, Key, Trash2, Edit2, Check, 
  X, AlertTriangle, MoreVertical, Search,
  ShieldAlert, Mail, Clock, Calendar, 
  UserCheck, UserX, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Badge, ConfirmDialog, PermissionGate } from '../common';
import { userService } from '../../services/userService';
import { permissionService, Permission } from '../../services/permissionService';
import { auditLogService } from '../../services/auditLogService';
import { authService } from '../../services/authService';
import { User, Role, UserStatus } from '../../types';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export const UserManagementTab = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isConfirmEnableOpen, setIsConfirmEnableOpen] = useState(false);
  
  const { user: currentUser } = useAuth();
  const { success, error } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      const fetchedUsers = await userService.getUsers();
      setUsers(fetchedUsers);
    };
    fetchUsers();
  }, []);

  const refreshUsers = async () => {
    const fetchedUsers = await userService.getUsers();
    setUsers(fetchedUsers);
  };

  const handleAddUser = async (userData: any) => {
    try {
      await userService.addUser(userData);
      await refreshUsers();
      setIsAddModalOpen(false);
      success('Identity Authorized', `New user ${userData.name} has been added to the system.`);
      await auditLogService.log('user_created', 'User', `Created new user: ${userData.email}`);
    } catch (err: any) {
      error('Authorization Failed', err.message || 'Failed to create user');
    }
  };

  const handleEditUser = async (userData: User) => {
    try {
      await userService.updateUser(userData);
      await refreshUsers();
      setIsEditModalOpen(false);
      success('Profile Synchronized', `Professional profile for ${userData.name} has been updated.`);
      await auditLogService.log('user_updated', 'User', `Updated user profile: ${userData.email}`);
    } catch (err: any) {
       error('Synchronization Failed', 'Could not update user profile metadata.');
    }
  };

  const handleResetPassword = async (userId: string, tempPass: string, forceChange: boolean) => {
    try {
      await userService.resetUserPassword(userId, tempPass, forceChange);
      setIsResetModalOpen(false);
      success('Credential Reset', 'Infrastructure has issued new temporary credentials.');
      await auditLogService.log('password_reset', 'User', `Reset password for user index: ${userId}`);
    } catch (err: any) {
       error('Credential Failure', 'Failed to issue new system credentials.');
    }
  };

  const handleDisableUser = async () => {
    if (selectedUser) {
      if (selectedUser.id === currentUser?.id) {
        error('Action Forbidden', 'You cannot disable your own primary administrative session.');
        return;
      }
      try {
        await userService.disableUser(selectedUser.id);
        await refreshUsers();
        setIsConfirmDeleteOpen(false);
        success('Access Revoked', `Authentication for ${selectedUser.name} has been restricted.`);
        await auditLogService.log('user_disabled', 'User', `Disabled user: ${selectedUser.email}`);
      } catch (err: any) {
        error('Revocation Error', 'Failed to update user authentication status.');
      }
    }
  };

  const handleEnableUser = async () => {
    if (selectedUser) {
      try {
        await userService.enableUser(selectedUser.id);
        await refreshUsers();
        setIsConfirmEnableOpen(false);
        success('Access Restored', `Authentication for ${selectedUser.name} has been re-authorized.`);
        await auditLogService.log('user_enabled', 'User', `Enabled user: ${selectedUser.email}`);
      } catch (err: any) {
        error('Authorization Error', 'Failed to restore user system access.');
      }
    }
  };

  return (
    <div className="space-y-8 pb-20">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Users & Governance</h2>
            <p className="text-sm text-slate-500 font-medium">Manage system access, identity roles, and permission architectures</p>
         </div>
         <PermissionGate permission={Permission.MANAGE_USERS}>
            <Button icon={UserPlus} onClick={() => setIsAddModalOpen(true)}>Invite Team Member</Button>
         </PermissionGate>
      </div>

      {/* User Table */}
      <Card className="border-slate-100 overflow-visible" noPadding>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-50">
                     <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name / Email</th>
                     <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Role</th>
                     <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                     <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Login</th>
                     <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Created Date</th>
                     <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-medium italic">
                        No team members registered yet.
                      </td>
                    </tr>
                  )}
                  {users.map((user) => (
                    <tr key={user.id} className="group hover:bg-slate-50/30 transition-colors">
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold shadow-inner">
                                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                             </div>
                             <div>
                                <p className="text-sm font-bold text-slate-900">{user.name}</p>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mt-0.5">
                                   <Mail size={12} /> {user.email}
                                </div>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <Badge color={user.role === Role.ADMIN ? 'purple' : user.role === Role.RISK_MANAGER ? 'blue' : user.role === Role.AUDITOR ? 'amber' : 'gray'}>
                             {user.role}
                          </Badge>
                       </td>
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${user.status === UserStatus.ACTIVE ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                             <span className={`text-xs font-bold ${user.status === UserStatus.ACTIVE ? 'text-slate-700' : 'text-slate-400'}`}>
                                {user.status}
                             </span>
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                             <Clock size={12} className="text-slate-300" />
                             {user.lastLogin ? format(new Date(user.lastLogin), 'MMM d, HH:mm') : 'Never'}
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                             <Calendar size={12} className="text-slate-300" />
                             {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}
                          </div>
                       </td>
                       <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <PermissionGate permission={Permission.MANAGE_USERS}>
                               <button 
                                  onClick={() => { setSelectedUser(user); setIsEditModalOpen(true); }}
                                  className="p-2 text-slate-400 hover:text-accent hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition-all shadow-sm"
                                  title="Edit User"
                               >
                                  <Edit2 size={16} />
                               </button>
                             </PermissionGate>
                             
                             <PermissionGate permission={Permission.RESET_PASSWORDS}>
                               <button 
                                  onClick={() => { setSelectedUser(user); setIsResetModalOpen(true); }}
                                  className="p-2 text-slate-400 hover:text-orange-500 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition-all shadow-sm"
                                  title="Reset Password"
                               >
                                  <Key size={16} />
                               </button>
                             </PermissionGate>

                             <PermissionGate permission={Permission.VIEW_AUDIT_LOGS}>
                               <button 
                                  onClick={() => { 
                                     success('Audit Discovery', `Tracing activity logs for identity: ${user.name}`);
                                     console.log('Audit logs for user:', user.id);
                                  }}
                                  className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition-all shadow-sm"
                                  title="View Audit Activity"
                               >
                                  <FileText size={16} />
                               </button>
                             </PermissionGate>

                             <PermissionGate permission={Permission.MANAGE_USERS}>
                               {user.id !== currentUser?.id && (
                                 user.status === UserStatus.ACTIVE ? (
                                   <button 
                                      onClick={() => { setSelectedUser(user); setIsConfirmDeleteOpen(true); }}
                                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition-all shadow-sm"
                                      title="Disable User"
                                   >
                                      <UserX size={16} />
                                   </button>
                                 ) : (
                                   <button 
                                      onClick={() => { setSelectedUser(user); setIsConfirmEnableOpen(true); }}
                                      className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition-all shadow-sm"
                                      title="Enable User"
                                   >
                                      <UserCheck size={16} />
                                   </button>
                                 )
                               )}
                             </PermissionGate>
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </Card>


      {/* Permissions Matrix Mock */}
      <h3 className="text-lg font-bold text-slate-900 mt-12 mb-4">RBAC Permissions Discovery</h3>
      <Card noPadding className="border-slate-100">
         <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] font-medium text-slate-600">
               <thead>
                  <tr className="bg-slate-900 text-white">
                     <th className="px-6 py-4 font-black uppercase tracking-widest opacity-60">Architectural Scope</th>
                     {Object.values(Role).map(role => (
                       <th key={role} className="px-6 py-4 text-center font-black uppercase tracking-widest">{role}</th>
                     ))}
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {permissionService.getPermissionMetadata().map(perm => (
                    <tr key={perm.id} className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{perm.label}</p>
                          <p className="text-[10px] text-slate-400 font-normal mt-0.5">{perm.description}</p>
                       </td>
                       {Object.values(Role).map(role => {
                         const hasPerm = permissionService.hasPermission(role, perm.id);
                         return (
                           <td key={role} className="px-6 py-4 text-center">
                              {hasPerm ? (
                                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto ring-1 ring-emerald-100">
                                   <Check size={14} strokeWidth={3} />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-slate-50 text-slate-200 flex items-center justify-center mx-auto">
                                   <X size={14} />
                                </div>
                              )}
                           </td>
                         );
                       })}
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </Card>

      {/* Security Notes */}
      <div className="bg-amber-50 border border-amber-200 rounded-[32px] p-8 flex gap-6">
         <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
            <ShieldAlert size={28} />
         </div>
         <div>
            <h4 className="text-lg font-bold text-amber-900 mb-2">DevOps Security Architecture Guidelines</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
               <div>
                  <h5 className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-1">Password Strategy</h5>
                  <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                     Passwords are NEVER stored in plain text in production environments. All identity metadata in this prototype is persisted via browser local encryption (localStorage simulation).
                  </p>
               </div>
               <div>
                  <h5 className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-1">Backend Readiness</h5>
                  <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                     Admin reset functions are service-decoupled. Transitioning to Supabase Auth or PostgreSQL will require replacing service logic in <code className="bg-amber-100/50 px-1 rounded">userService.ts</code>.
                  </p>
               </div>
               <div>
                  <h5 className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-1">API Resilience</h5>
                  <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                     JWT tokens and sensitive secrets must remain exclusively on the server side. Currently, roles are verified against the active mock session.
                  </p>
               </div>
               <div>
                  <h5 className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-1">Identity Federation</h5>
                  <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                     Final deployment should integrate with OIDC or SAML 2.0 (Azure AD / Okta) for enterprise-grade Identity and Access Management (IAM).
                  </p>
               </div>
            </div>
         </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isAddModalOpen && (
          <UserModal 
             isOpen={true} 
             onClose={() => setIsAddModalOpen(false)} 
             onSubmit={handleAddUser}
             users={users}
             title="Invite New User" 
          />
        )}
        {isEditModalOpen && selectedUser && (
          <UserModal 
             isOpen={true} 
             onClose={() => setIsEditModalOpen(false)} 
             onSubmit={handleEditUser}
             users={users}
             initialData={selectedUser}
             title="Modify Professional Profile" 
          />
        )}
        {isResetModalOpen && selectedUser && (
          <PasswordResetModal 
             isOpen={true}
             user={selectedUser}
             onClose={() => setIsResetModalOpen(false)}
             onSubmit={handleResetPassword}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={isConfirmDeleteOpen}
        title="Revoke System Access"
        message={`Are you sure you want to disable access for ${selectedUser?.name}? This user will no longer be able to authenticate into the platform.`}
        confirmLabel="Disable Account"
        onConfirm={handleDisableUser}
        onCancel={() => setIsConfirmDeleteOpen(false)}
      />

      <ConfirmDialog 
        isOpen={isConfirmEnableOpen}
        title="Restore System Access"
        message={`Are you sure you want to enable access for ${selectedUser?.name}? This user will regain full authentication capabilities.`}
        confirmLabel="Enable Account"
        variant="primary"
        onConfirm={handleEnableUser}
        onCancel={() => setIsConfirmEnableOpen(false)}
      />
    </div>
  );
};

// --- Sub-components (Modals) ---

const UserModal = ({ isOpen, onClose, onSubmit, initialData, title, users = [] }: any) => {
  const { organization } = useAuth();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    role: initialData?.role || Role.VIEWER,
    status: initialData?.status || UserStatus.ACTIVE,
    organizationId: initialData?.organizationId || organization?.id || 'org-default',
    forcePasswordChange: initialData?.forcePasswordChange ?? true
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: any = {};
    if (!formData.name) newErrors.name = 'Full name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
       newErrors.email = 'Invalid email format';
    }

    if (!initialData) {
       if (!password) newErrors.password = 'Password is required';
       else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
       if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
       
       // Duplicate check (Note: in a real app this would be a server-side check or a dedicated service call)
       // For now, we compare against the already loaded users list or fetch fresh
       if (users.some(u => u.email === formData.email)) {
          newErrors.email = 'User with this email already exists';
       }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSumbit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(initialData ? { ...initialData, ...formData } : { ...formData, password });
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
       <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden">
          <div className="p-10 border-b border-slate-50 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 text-accent rounded-2xl flex items-center justify-center">
                   <UserPlus size={24} />
                </div>
                <div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h3>
                   <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-widest">Configuration & Identity</p>
                </div>
             </div>
             <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 transition-colors"><X size={24} /></button>
          </div>
          <form onSubmit={handleSumbit} className="p-10 space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Legal Full Name</label>
                   <input 
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full bg-slate-50 border ${errors.name ? 'border-rose-300' : 'border-slate-200'} rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-accent/10 transition-all`} 
                      placeholder="Jane Cooper"
                   />
                   {errors.name && <p className="text-[9px] text-rose-500 font-bold px-1">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Professional Email</label>
                   <input 
                      type="text" 
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full bg-slate-50 border ${errors.email ? 'border-rose-300' : 'border-slate-200'} rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-accent/10 transition-all`} 
                      placeholder="jane@company.com"
                   />
                   {errors.email && <p className="text-[9px] text-rose-500 font-bold px-1">{errors.email}</p>}
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Functional Access Level</label>
                   <select 
                      value={formData.role}
                      onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-accent/10 transition-all appearance-none cursor-pointer"
                   >
                      {Object.values(Role).map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Current Account Status</label>
                   <select 
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as UserStatus })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-accent/10 transition-all appearance-none cursor-pointer"
                   >
                      <option value={UserStatus.ACTIVE}>Active Access</option>
                      <option value={UserStatus.DISABLED}>Disabled Account</option>
                   </select>
                </div>
             </div>

             {!initialData ? (
                <div className="space-y-6 pt-4 border-t border-slate-50">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Temporary Password</label>
                         <input 
                            type="password" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className={`w-full bg-slate-50 border ${errors.password ? 'border-rose-300' : 'border-slate-200'} rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-accent/10 transition-all`} 
                            placeholder="••••••••"
                         />
                         {errors.password && <p className="text-[9px] text-rose-500 font-bold px-1">{errors.password}</p>}
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Confirm Password</label>
                         <input 
                            type="password" 
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className={`w-full bg-slate-50 border ${errors.confirmPassword ? 'border-rose-300' : 'border-slate-200'} rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-accent/10 transition-all`} 
                            placeholder="••••••••"
                         />
                         {errors.confirmPassword && <p className="text-[9px] text-rose-500 font-bold px-1">{errors.confirmPassword}</p>}
                      </div>
                   </div>
                   
                   <label className="flex items-center gap-3 cursor-pointer group p-4 bg-accent/5 rounded-2xl border border-accent/10">
                      <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${formData.forcePasswordChange ? 'bg-accent border-accent' : 'bg-white border-slate-200 group-hover:border-slate-300'}`}>
                         {formData.forcePasswordChange && <Check size={14} className="text-white" strokeWidth={4} />}
                         <input type="checkbox" className="hidden" checked={formData.forcePasswordChange} onChange={e => setFormData({ ...formData, forcePasswordChange: e.target.checked })} />
                      </div>
                      <span className="text-xs font-bold text-slate-600 italic">Force password change on initial login</span>
                   </label>
                </div>
             ) : (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                   <p className="text-[10px] text-amber-700 font-bold flex items-center gap-2">
                      <Shield size={14} /> Password management is handled via the "Reset Key" action in the user registry.
                   </p>
                </div>
             )}

             <div className="pt-6 flex gap-4">
                <Button variant="secondary" className="flex-grow h-12 font-black" onClick={onClose}>Discard Changes</Button>
                <Button type="submit" className="flex-grow h-12 font-black" icon={initialData ? Edit2 : ShieldCheck}>{initialData ? 'Update Profile' : 'Authorize Identity'}</Button>
             </div>
          </form>
       </motion.div>
    </div>
  );
};


const PasswordResetModal = ({ isOpen, user, onClose, onSubmit }: any) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [forceChange, setForceChange] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Password is required');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    onSubmit(user.id, password, forceChange);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
       <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden p-10">
          <div className="text-center mb-8">
             <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Key size={32} />
             </div>
             <h3 className="text-xl font-bold text-slate-900">Force Password Reset</h3>
             <p className="text-sm text-slate-500 font-medium mt-1">For account of <span className="font-bold text-slate-800">{user.email}</span></p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">New Temporary Password</label>
                <input 
                   type="password" 
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-accent/10 transition-all" 
                   placeholder="••••••••"
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Confirm New Password</label>
                <input 
                   type="password" 
                   value={confirm}
                   onChange={e => setConfirm(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-accent/10 transition-all" 
                   placeholder="••••••••"
                />
             </div>

             <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${forceChange ? 'bg-accent border-accent' : 'bg-white border-slate-200 group-hover:border-slate-300'}`}>
                   {forceChange && <Check size={14} className="text-white" strokeWidth={4} />}
                   <input type="checkbox" className="hidden" checked={forceChange} onChange={e => setForceChange(e.target.checked)} />
                </div>
                <span className="text-xs font-bold text-slate-600">Force password change on next login</span>
             </label>

             {error && <p className="text-[10px] text-rose-500 font-bold text-center">{error}</p>}

             <div className="pt-4 flex gap-4">
                <Button variant="secondary" className="flex-grow" onClick={onClose}>Cancel</Button>
                <Button type="submit" className="flex-grow" color="orange">Apply Reset</Button>
             </div>
          </form>
       </motion.div>
    </div>
  );
};

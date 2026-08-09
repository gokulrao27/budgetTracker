import bcrypt from 'bcryptjs';
import crypto from 'crypto';
export const roles=['SUPER_ADMIN','ADMIN','FRIEND'] as const; export type Role=typeof roles[number];
export const paymentStatuses=['PENDING','APPROVED','REJECTED'] as const; export type PaymentStatus=typeof paymentStatuses[number];
export type User={id:string;name:string;name_normalized:string;role:Role;password_hash:string;must_change_password:boolean;required_contribution:number;bio?:string|null;profile_photo_path?:string|null;created_at:string};
export type Payment={id:string;user_id:string;amount:number;status:PaymentStatus;screenshot_path:string;notes?:string|null;method?:string|null;reference_id?:string|null;idempotency_key:string;approved_at?:string|null;approved_by?:string|null;rejected_at?:string|null;rejected_by?:string|null;rejection_reason?:string|null;created_at:string};
export type Expense={id:string;amount:number;category:string;description:string;notes?:string|null;created_by:string;deleted_at?:string|null;created_at:string;updated_at:string};
export type Audit={id:string;actor_id?:string|null;action:string;entity_type:string;entity_id:string;metadata:Record<string,unknown>;created_at:string};
export function normalizeName(name:string){return name.trim().replace(/\s+/g,' ').toLowerCase()}
export function validatePassword(p:string){return typeof p==='string'&&p.length>=8&&p.length<=128}
export async function hashPassword(p:string){return bcrypt.hash(p,12)}
export async function verifyPassword(p:string,h:string){return bcrypt.compare(p,h)}
export function temporaryPassword(){return crypto.randomBytes(9).toString('base64url')}
export function newId(prefix='id'){return `${prefix}_${crypto.randomUUID()}`}
export function contributionSummary(user:Pick<User,'required_contribution'>,payments:Payment[]){const approved=payments.filter(p=>p.status==='APPROVED').reduce((s,p)=>s+p.amount,0);const pending=payments.filter(p=>p.status==='PENDING').reduce((s,p)=>s+p.amount,0);return{required:user.required_contribution,approvedPaid:approved,pendingAmount:pending,remaining:user.required_contribution-approved}}
export function budgetSummary(totalBudget:number,expenses:Expense[]){const active=expenses.filter(e=>!e.deleted_at);const totalSpent=active.reduce((s,e)=>s+e.amount,0);const byCategory=active.reduce<Record<string,number>>((m,e)=>{m[e.category]=(m[e.category]??0)+e.amount;return m},{});return{totalBudget,totalSpent,remainingBudget:totalBudget-totalSpent,byCategory}}
export function assertImage(file:{type:string;size:number}){if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Only PNG, JPG, or WEBP images are allowed.'); if(file.size>5*1024*1024)throw new Error('Images must be 5 MB or smaller.')}

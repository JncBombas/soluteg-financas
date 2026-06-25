import { z } from "zod";

export const TransactionSchema = z.object({
  amount: z.number().positive("O valor deve ser positivo"),
  description: z.string().min(2, "A descrição deve ter pelo menos 2 caracteres").max(255),
  type: z.enum(["INCOME", "EXPENSE"]),
  date: z.string().datetime().optional(),
  categoryId: z.string().optional(),
});

export const NewTransactionSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(2).max(255),
  type: z.enum(["INCOME", "EXPENSE"]),
  paymentMethod: z.enum(["CASH", "DEBIT", "CREDIT", "PIX", "BOLETO", "TRANSFER"]),
  categoryId: z.string().min(1),
  date: z.string(),
  notes: z.string().optional(),
  fee: z.number().optional(),
  creditCardId: z.string().optional(),
  bankAccountId: z.string().optional(),
  context: z.enum(["PF", "PJ"]).default("PF"),
  transactionMode: z.enum(["SINGLE", "INSTALLMENT", "RECURRING"]),
  installments: z.number().int().min(2).max(72).optional(),
  dueDay: z.number().int().min(1).max(28).optional(),
  occurrences: z.number().int().min(1).max(120).optional(),
  frequency: z.enum(["MONTHLY", "WEEKLY", "YEARLY"]).optional(),
});

export const UpdateTransactionSchema = z.object({
  amount: z.number().positive().optional(),
  description: z.string().min(2).max(255).optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  paymentMethod: z.enum(["CASH", "DEBIT", "CREDIT", "PIX", "BOLETO", "TRANSFER"]).optional(),
  categoryId: z.string().optional(),
  date: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  fee: z.number().optional(),
  creditCardId: z.string().nullable().optional(),
  bankAccountId: z.string().nullable().optional(),
  context: z.enum(["PF", "PJ"]).optional(),
  editScope: z.enum(["SINGLE", "THIS_AND_FOLLOWING", "ALL"]).optional(),
});

export const CategorySchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(["INCOME", "EXPENSE"]),
  nature: z.enum(["FIXED", "VARIABLE"]),
  context: z.enum(["PERSONAL", "BUSINESS"]),
  group: z.string().min(2).max(100),
});

export const UpdateCategorySchema = CategorySchema.partial();

export const BankAccountSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(["CHECKING", "SAVINGS", "DIGITAL", "INVESTMENT"]),
  initialBalance: z.number().default(0),
  color: z.string().optional(),
  icon: z.string().optional(),
  context: z.enum(["PF", "PJ"]).default("PF"),
  servicePackageName: z.string().optional(),
  servicePackageAmount: z.number().min(0).optional(),
  overdraftLimit: z.number().min(0).optional(),
});

export const UpdateBankAccountSchema = BankAccountSchema.partial();

export const CreditCardSchema = z.object({
  name: z.string().min(2).max(100),
  brand: z.enum(["VISA", "MASTERCARD", "ELO", "AMEX", "HIPERCARD", "OTHER"]),
  lastFourDigits: z.string().length(4).optional(),
  closingDay: z.number().int().min(1).max(28),
  dueDay: z.number().int().min(1).max(28),
  limit: z.number().positive(),
  color: z.string().optional(),
  context: z.enum(["PF", "PJ"]).default("PF"),
});

export const UpdateCreditCardSchema = CreditCardSchema.partial();

export const RecurringExpenseSchema = z.object({
  description: z.string().min(2, "A descrição deve ter pelo menos 2 caracteres").max(255),
  amount: z.number().positive("O valor deve ser positivo"),
  isVariable: z.boolean().default(false),
  paymentMethod: z.enum(["CASH", "DEBIT", "CREDIT", "PIX", "BOLETO", "TRANSFER"]).default("BOLETO"),
  dueDay: z.number().int().min(1).max(28),
  frequency: z.enum(["MONTHLY", "WEEKLY", "YEARLY"]).default("MONTHLY"),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  context: z.enum(["PF", "PJ"]).default("PF"),
  categoryId: z.string().optional().nullable(),
  bankAccountId: z.string().optional().nullable(),
  creditCardId: z.string().optional().nullable(),
});

export const UpdateRecurringExpenseSchema = RecurringExpenseSchema.partial();

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

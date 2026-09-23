"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DateField } from "@/components/shared/date-field";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, formatAmount, parseAmountToCents } from "../money";
import {
  PAYMENT_CURRENCIES,
  PAYMENT_CURRENCY_LABELS,
  convertToMxnCents,
  parseRateToMicros,
  type PaymentCurrency,
} from "../currency";
import { recordPayment } from "../actions";

/**
 * Records money that has arrived — always counted in pesos.
 *
 * Paid in another currency, the form asks what one unit was worth in pesos and
 * shows what the payment comes to before it is saved; that peso figure is what
 * every total uses, and the original amount is kept alongside.
 */
export function RecordPayment({
  students,
  defaultDate,
}: {
  students: { id: string; name: string }[];
  defaultDate: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<PaymentCurrency>("MXN");
  const [rate, setRate] = useState("");
  const [method, setMethod] = useState<string>("TRANSFER");
  const [receivedOn, setReceivedOn] = useState(defaultDate);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isForeign = currency !== "MXN";
  const amountCents = parseAmountToCents(amount);
  const rateMicros = parseRateToMicros(rate);
  const pesoPreview =
    isForeign && amountCents !== null && rateMicros !== null
      ? convertToMxnCents(amountCents, rateMicros)
      : null;

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await recordPayment({
        studentId,
        amount,
        currency,
        exchangeRate: isForeign ? rate : undefined,
        method: method as "CASH" | "STRIPE" | "TRANSFER",
        receivedOn,
        notes,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Payment recorded");
      setStudentId("");
      setAmount("");
      setRate("");
      setCurrency("MXN");
      setNotes("");
      setIsOpen(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" /> Record payment
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>Money that has arrived.</DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="payment-student">Student</Label>
              <Select
                items={students.map((student) => ({ label: student.name, value: student.id }))}
                value={studentId}
                onValueChange={(value) => value !== null && setStudentId(value)}
              >
                <SelectTrigger id="payment-student" className="w-full">
                  <SelectValue placeholder="Who paid" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-amount">Amount</Label>
              <Input
                id="payment-amount"
                inputMode="decimal"
                placeholder="2999"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-currency">Currency</Label>
              <Select
                items={PAYMENT_CURRENCIES.map((code) => ({
                  label: PAYMENT_CURRENCY_LABELS[code],
                  value: code,
                }))}
                value={currency}
                onValueChange={(value) => value !== null && setCurrency(value as PaymentCurrency)}
              >
                <SelectTrigger id="payment-currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_CURRENCIES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {PAYMENT_CURRENCY_LABELS[code]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isForeign && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="payment-rate">Pesos per 1 {currency}</Label>
                <Input
                  id="payment-rate"
                  inputMode="decimal"
                  placeholder="17.07"
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {pesoPreview !== null
                    ? `Counts as ${formatAmount(pesoPreview, "MXN")}`
                    : "Use the rate the money actually arrived at."}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="payment-method">How</Label>
              <Select
                items={PAYMENT_METHODS.map((value) => ({
                  label: PAYMENT_METHOD_LABELS[value],
                  value,
                }))}
                value={method}
                onValueChange={(value) => value !== null && setMethod(value)}
              >
                <SelectTrigger id="payment-method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {PAYMENT_METHOD_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-date">Received on</Label>
              <DateField id="payment-date" value={receivedOn} onChange={setReceivedOn} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="payment-notes">
                Notes <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="payment-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !studentId || !amount || (isForeign && rateMicros === null)}
          >
            {isSaving ? "Saving..." : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

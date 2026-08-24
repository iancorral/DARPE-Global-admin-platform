"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CURRENCIES, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "../money";
import { recordPayment } from "../actions";

/**
 * Records money that has arrived.
 *
 * There is nothing to reconcile against — DARPE counts revenue when the money
 * lands, and what a student was expected to pay is not modelled — so this is
 * simply a note of a fact: who, how much, how, and when.
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
  const [currency, setCurrency] = useState<string>("MXN");
  const [method, setMethod] = useState<string>("CASH");
  const [receivedOn, setReceivedOn] = useState(defaultDate);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await recordPayment({
        studentId,
        amount,
        currency: currency as "MXN" | "USD",
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
      setNotes("");
      setIsOpen(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="size-4" /> Record payment
      </Button>
    );
  }

  return (
    <div className="w-full space-y-4 rounded-xl border bg-card p-5 shadow-xs">
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
            placeholder="2380"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment-currency">Currency</Label>
          <Select
            items={CURRENCIES.map((code) => ({ label: code, value: code }))}
            value={currency}
            onValueChange={(value) => value !== null && setCurrency(value)}
          >
            <SelectTrigger id="payment-currency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
          <Input
            id="payment-date"
            type="date"
            value={receivedOn}
            onChange={(event) => setReceivedOn(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            The month this counts towards.
          </p>
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

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={isSaving || !studentId || !amount}>
          {isSaving ? "Saving..." : "Record payment"}
        </Button>
        <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

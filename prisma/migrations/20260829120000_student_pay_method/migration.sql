-- How each student usually pays.
--
-- A property of the person rather than of a payment: DARPE wants to see who is
-- on transfer and who is on Stripe without opening anything. Nullable, because
-- nobody has said yet for most of them, and a default would be a guess.
ALTER TABLE "students" ADD COLUMN "payMethod" "PaymentMethod";

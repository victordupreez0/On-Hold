/** A South African cellphone number, like 082 123 4567 or +27 82 123 4567. */
export const isSaCell = (phone: string) => /^(\+27|0)[6-8]\d{8}$/.test(phone.replace(/\s/g, ''));

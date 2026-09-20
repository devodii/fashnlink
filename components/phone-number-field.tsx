'use client';

import * as React from 'react';
import { type TCountryCode, getCountryData } from 'countries-list';
import { countries } from 'country-flag-icons';
import * as CountryFlags from 'country-flag-icons/react/3x2';
import { AsYouType, type CountryCode, parsePhoneNumberWithError } from 'libphonenumber-js';
import { Check } from '@phosphor-icons/react/ssr';
import { z } from 'zod';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { InputGroup, InputGroupInput } from '@/components/ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export const phoneNumberSchema = z.object({
  number: z.string().min(1, 'Phone number is required'),
  countryCode: z.string().default('US'),
});

export type PhoneNumber = z.infer<typeof phoneNumberSchema>;

const DEFAULT_COUNTRY_CODE = 'US';

export function phoneNumberToString(phoneNumber: PhoneNumber): string {
  try {
    const parsed = parsePhoneNumberWithError(
      phoneNumber.number,
      phoneNumber.countryCode as CountryCode,
    );
    if (parsed?.isValid()) return parsed.formatInternational();
  } catch {}
  const { phone } = getCountryData(phoneNumber.countryCode as TCountryCode);
  const prefix = phone?.[0] ? `+${phone[0]}` : '+1';
  const digits = phoneNumber.number.replace(/[^\d]/g, '');
  return `${prefix} ${digits}`;
}

export function phoneNumberFromString(raw: string): PhoneNumber {
  if (!raw?.trim()) return { number: '', countryCode: DEFAULT_COUNTRY_CODE };

  try {
    const parsed = parsePhoneNumberWithError(raw);
    if (parsed?.country) {
      return { number: parsed.formatNational(), countryCode: parsed.country };
    }
  } catch {}

  const countryCodeMatch = raw.match(/^(\+\d{1,4})/);
  if (!countryCodeMatch) {
    return { number: raw.replace(/[^\d]/g, ''), countryCode: DEFAULT_COUNTRY_CODE };
  }

  const prefix = countryCodeMatch[1];
  const number = raw.slice(prefix.length).replace(/[^\d]/g, '');

  if (prefix === '+1') return { number, countryCode: DEFAULT_COUNTRY_CODE };

  const countryCode = countries.find((iso) => {
    const { phone } = getCountryData(iso as TCountryCode);
    return phone && phone.length > 0 && `+${phone[0]}` === prefix;
  });

  return { number, countryCode: countryCode ?? DEFAULT_COUNTRY_CODE };
}

export interface PhoneNumberFieldProps {
  id: string;
  value: PhoneNumber;
  onChange: (v: PhoneNumber) => void;
  disabled?: boolean;
  className?: string;
}

const COUNTRIES_DATA = countries.flatMap((countryCode) => {
  const { name, phone } = getCountryData(countryCode as TCountryCode);
  if (!name || !phone.length) return [];

  return phone.map((prefix) => ({
    name,
    prefix: `+${prefix}`,
    countryCode,
    searchKey: `${name} ${countryCode} +${prefix}`.toLowerCase(),
  }));
});

const CountryFlag = React.memo(function CountryFlag({ countryCode }: { countryCode: string }) {
  const FlagComponent = CountryFlags[countryCode as TCountryCode];
  return FlagComponent ? (
    <FlagComponent className="h-4 w-6 shrink-0 rounded border border-border/40 object-cover" />
  ) : (
    <CountryFlags.US className="h-4 w-6 shrink-0 rounded border border-border/40 object-cover" />
  );
});

function formatAsYouType(raw: string, countryCode: string): string {
  const formatted = new AsYouType(countryCode as CountryCode).input(raw);
  const digits = raw.replace(/\D/g, '');

  // AsYouType echoes back raw digits when it can't match a pattern — fall back to simple grouping.
  if (formatted === digits && digits.length >= 6) {
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  }

  return formatted;
}

export function PhoneNumberField({
  id,
  value,
  onChange,
  disabled,
  className,
}: PhoneNumberFieldProps) {
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectedCountry = React.useMemo(
    () => COUNTRIES_DATA.find((c) => c.countryCode === value.countryCode),
    [value.countryCode],
  );

  const sortedCountries = React.useMemo(() => {
    return [...COUNTRIES_DATA].sort((a, b) => {
      if (a.countryCode === value.countryCode) return -1;
      if (b.countryCode === value.countryCode) return 1;
      return 0;
    });
  }, [value.countryCode]);

  const displayNumber = React.useMemo(
    () => (value.number ? formatAsYouType(value.number, value.countryCode) : ''),
    [value.number, value.countryCode],
  );

  function handleCountrySelect(countryCode: string) {
    const digits = value.number.replace(/\D/g, '');
    const number = digits ? formatAsYouType(digits, countryCode) : '';
    onChange({ countryCode, number });
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const newDigits = raw.replace(/\D/g, '');
    const prevDigits = displayNumber.replace(/\D/g, '');

    // When the user backspaces a formatting character (paren, space, dash) the digit
    // count stays the same but the raw string shrinks — remove the preceding digit too
    // so the field doesn't get stuck (e.g. perpetually showing "(708)").
    const digits =
      newDigits.length === prevDigits.length && raw.length < displayNumber.length
        ? newDigits.slice(0, -1)
        : newDigits;

    onChange({ ...value, number: digits ? formatAsYouType(digits, value.countryCode) : '' });
  }

  return (
    <InputGroup
      className={cn('h-10 w-full rounded-md border border-input bg-transparent', className)}
    >
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="flex h-full gap-2 rounded-r-none border-r border-input bg-transparent px-3 hover:bg-accent hover:text-accent-foreground"
          >
            <CountryFlag countryCode={value.countryCode || 'US'} />
            <span className="font-mono text-sm">{selectedCountry?.prefix || '+1'}</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-75 border bg-background p-0 shadow-lg" align="start">
          <Command>
            <CommandInput placeholder="Search country..." />
            <CommandList className="max-h-75 overflow-y-auto">
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {sortedCountries.map((country) => (
                  <CommandItem
                    key={`${country.countryCode}-${country.prefix}`}
                    value={country.searchKey}
                    onSelect={() => handleCountrySelect(country.countryCode)}
                    className={cn(
                      'gap-3',
                      value.countryCode === country.countryCode &&
                        'bg-primary/10 hover:bg-primary/20',
                    )}
                  >
                    <CountryFlag countryCode={country.countryCode} />
                    <span className="flex-1 truncate">{country.name}</span>
                    <span className="font-mono text-sm text-muted-foreground">
                      {country.prefix}
                    </span>
                    {value.countryCode === country.countryCode && (
                      <Check className="ml-auto size-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <InputGroupInput
        type="tel"
        id={id}
        placeholder="Phone number"
        value={displayNumber}
        ref={inputRef}
        onChange={handleNumberChange}
        disabled={disabled}
        className="mr-3 ml-1 flex-1 px-3 py-1"
      />
    </InputGroup>
  );
}

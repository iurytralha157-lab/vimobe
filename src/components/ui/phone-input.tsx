import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parsePhoneInput, formatPhoneFromParts, countries, type Country } from '@/lib/phone-utils';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PhoneInput({
  value,
  onChange,
  placeholder = "00000-0000",
  disabled = false,
  className,
}: PhoneInputProps) {
  const [countryPopoverOpen, setCountryPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Parse the current value to get parts
  const parsed = useMemo(() => parsePhoneInput(value), [value]);
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find(c => c.code === parsed.countryCode) || countries[0]
  );
  const [ddd, setDdd] = useState(parsed.ddd);
  const [number, setNumber] = useState(parsed.number);

  // Update internal state when value changes externally
  // Only update if values actually changed to prevent focus loss
  useEffect(() => {
    const newParsed = parsePhoneInput(value);
    const newCountry = countries.find(c => c.code === newParsed.countryCode) || countries[0];
    
    // Only update if values actually differ
    if (newParsed.ddd !== ddd || newParsed.number !== number || newCountry.code !== selectedCountry.code) {
      setSelectedCountry(newCountry);
      setDdd(newParsed.ddd);
      setNumber(newParsed.number);
    }
  }, [value]);

  // Format number with mask (XXXXX-XXXX or XXXX-XXXX)
  const formatNumber = (num: string) => {
    const cleaned = num.replace(/\D/g, '').slice(0, 9);
    if (cleaned.length <= 4) return cleaned;
    if (cleaned.length <= 8) {
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    }
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  };

  // Handle changes and notify parent
  const handleChange = (newCountry: Country, newDdd: string, newNumber: string) => {
    const cleanDdd = newDdd.replace(/\D/g, '').slice(0, 3);
    const cleanNumber = newNumber.replace(/\D/g, '').slice(0, 9);
    
    setSelectedCountry(newCountry);
    setDdd(cleanDdd);
    setNumber(cleanNumber);
    
    const fullNumber = formatPhoneFromParts(newCountry.code, cleanDdd, cleanNumber);
    onChange(fullNumber);
  };

  const handleCountrySelect = (country: Country) => {
    handleChange(country, ddd, number);
    setCountryPopoverOpen(false);
    setSearchQuery('');
  };

  const handleDddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDdd = e.target.value.replace(/\D/g, '').slice(0, 3);
    handleChange(selectedCountry, newDdd, number);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value.replace(/\D/g, '').slice(0, 9);
    handleChange(selectedCountry, ddd, newNumber);
  };

  const filteredCountries = useMemo(() => {
    if (!searchQuery) return countries;
    const query = searchQuery.toLowerCase();
    return countries.filter(
      c => c.name.toLowerCase().includes(query) || c.code.includes(query)
    );
  }, [searchQuery]);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Country Selector */}
      <Popover open={countryPopoverOpen} onOpenChange={setCountryPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="w-[100px] justify-between px-2 font-normal"
          >
            <span className="flex items-center gap-1 truncate">
              <span className="text-base">{selectedCountry.flag}</span>
              <span className="text-sm text-muted-foreground">+{selectedCountry.code}</span>
            </span>
            <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar país..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </div>
          <ScrollArea className="h-[200px]">
            <div className="p-1">
              {filteredCountries.map((country) => (
                <button
                  key={country.code + country.name}
                  onClick={() => handleCountrySelect(country)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent text-left",
                    selectedCountry.code === country.code && "bg-accent"
                  )}
                >
                  <span className="text-lg">{country.flag}</span>
                  <span className="flex-1 truncate">{country.name}</span>
                  <span className="text-muted-foreground">+{country.code}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* DDD Input */}
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">(</span>
        <Input
          value={ddd}
          onChange={handleDddChange}
          placeholder="00"
          disabled={disabled}
          className="w-[52px] text-center px-4"
          maxLength={3}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">)</span>
      </div>

      {/* Number Input */}
      <Input
        value={formatNumber(number)}
        onChange={handleNumberChange}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
      />
    </div>
  );
}

import { Component, Input, forwardRef, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, NG_VALIDATORS, Validator, AbstractControl, ValidationErrors, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { parsePhoneNumber, isValidPhoneNumber, CountryCode, getCountries, getCountryCallingCode, AsYouType } from 'libphonenumber-js';

export interface CountryInfo {
  code: CountryCode;
  name: string;
  callingCode: string;
  flag: string;
}

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './phone-input.component.html',
  styleUrls: ['./phone-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true
    }
  ]
})
export class PhoneInputComponent implements ControlValueAccessor, Validator, OnInit {
  @Input() label = '';
  @Input() required = false;
  @Input() placeholder = '600 123 456';

  selectedCountry: CountryCode = 'ES'; // Default Spain
  displayValue = ''; // The number part typed by user

  isDisabled = false;
  touched = false;

  countries: CountryInfo[] = [];

  // Callbacks
  onChange = (value: string | null) => { };
  onTouched = () => { };

  constructor() { }

  ngOnInit() {
    this.countries = this.getCountryList();
  }

  // --- ControlValueAccessor ---

  writeValue(value: string): void {
    if (!value) {
      this.displayValue = '';
      return;
    }

    try {
      const phoneNumber = parsePhoneNumber(value);
      if (phoneNumber) {
        this.selectedCountry = phoneNumber.country as CountryCode || 'ES';
        // National format removes the +34 part usually
        this.displayValue = phoneNumber.formatNational();
      } else {
        this.displayValue = value;
      }
    } catch (e) {
      this.displayValue = value;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  // --- Validator ---

  validate(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) {
      return this.required ? { required: true } : null;
    }

    // Si hay valor, validamos si es un número real
    if (!isValidPhoneNumber(value, this.selectedCountry)) { // Pasamos el país seleccionado por defecto para validar locales
      // Una comprobacion extra por si acaso el value es full E.164
      try {
        if (isValidPhoneNumber(value)) return null;
      } catch (e) { }

      return { invalidPhoneNumber: true };
    }

    return null;
  }

  get isInvalid(): boolean {
    // Very basic local check, actual form validation happens via Validator fn
    // But we can check internal state
    if (!this.displayValue && this.required) return true;
    if (this.displayValue) {
      // Check parse
      try {
        const asYouType = new AsYouType(this.selectedCountry);
        asYouType.input(this.displayValue);
        const num = asYouType.getNumber();
        return !num || !num.isValid();
      } catch (e) { return true }
    }
    return false;
  }

  // --- Event Handlers ---

  onCountryChange(countryCode: CountryCode) {
    this.selectedCountry = countryCode;
    this.triggerChange();
  }

  onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.displayValue = input.value;
    this.triggerChange();
  }

  private triggerChange() {
    if (!this.displayValue) {
      this.onChange(null);
      return;
    }

    try {
      // Combine Country + Number to produce E.164
      const phoneNumber = parsePhoneNumber(this.displayValue, this.selectedCountry);
      if (phoneNumber) {
        this.onChange(phoneNumber.format('E.164'));
      } else {
        // Fallback to raw if logic fails (shouldn't if lib is good)
        this.onChange(this.displayValue);
      }
    } catch (error) {
      // Incomplete or invalid
      this.onChange(this.displayValue);
    }
  }

  // --- Helpers ---

  private getCountryList(): CountryInfo[] {
    const codes = getCountries();
    const list: CountryInfo[] = codes.map(code => ({
      code,
      name: code, // Can use a proper display name lib if needed
      callingCode: getCountryCallingCode(code),
      flag: this.getFlagEmoji(code)
    }));

    // Sort: ES first, then by name
    return list.sort((a, b) => {
      if (a.code === 'ES') return -1;
      if (b.code === 'ES') return 1;
      return a.name.localeCompare(b.name);
    });
  }

  private getFlagEmoji(countryCode: string) {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }
}

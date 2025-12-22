import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HourSelectorComponent } from './hour-selector.component';
import { TimeUtils } from '@domain/shared/utils/time.utils';

describe('HourSelectorComponent', () => {
  let fixture: ComponentFixture<HourSelectorComponent>;
  let component: HourSelectorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HourSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HourSelectorComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('date', '2099-01-01');
    fixture.componentRef.setInput('availableHours', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute hours with all enabled for future date', () => {
    const futureDate = '2099-01-01';
    fixture.componentRef.setInput('date', futureDate);
    fixture.componentRef.setInput('availableHours', ['09:00', '10:00', '11:00']);
    
    fixture.detectChanges();
    const hours = component.hours();
    expect(hours.length).toBe(3);
    expect(hours.map(h => h.value)).toEqual(['09:00', '10:00', '11:00']);
    expect(hours.every(h => h.disabled === false)).toBeTrue();
  });

  it('should disable past hours when date is today', () => {
    const now = new Date();
    const todayStr = TimeUtils.toISODate(now); // same util as component
    fixture.componentRef.setInput('date', todayStr);
    fixture.componentRef.setInput('availableHours', ['00:00', '12:00', '23:59']);

    fixture.detectChanges();

    const hours = component.hours();
    expect(hours.length).toBe(3);

    const early = hours.find(h => h.value === '00:00')!;
    const late = hours.find(h => h.value === '23:59')!;

    expect(early.disabled).toBeTrue();   // in the past today
    // late might be disabled or not depending on current time,
    // so just assert we have at least one disabled:
    expect(hours.some(h => h.disabled)).toBeTrue();
  });

  it('should select hour only if not disabled', () => {
    const hourEnabled = { value: '10:00', disabled: false };
    const hourDisabled = { value: '09:00', disabled: true };

    component.selectHour(hourEnabled);
    expect(component.selectedHour()).toBe('10:00');

    component.selectHour(hourDisabled);
    expect(component.selectedHour()).toBe('10:00'); // unchanged
  });

  it('should emit hourSelected on confirm when selectedHour exists', () => {
    const emitted: string[] = [];
    component.hourSelected.subscribe(h => emitted.push(h));

    component.selectedHour.set('10:30');

    component.confirm();

    expect(emitted).toEqual(['10:30']);
  });

  it('should not emit on confirm when no selectedHour', () => {
    const emitted: string[] = [];
    component.hourSelected.subscribe(h => emitted.push(h));

    component.confirm();

    expect(emitted.length).toBe(0);
  });

  it('should set selectedHour and emit on confirmDirect for enabled hour', () => {
    const emitted: string[] = [];
    component.hourSelected.subscribe(h => emitted.push(h));

    const hour = { value: '11:00', disabled: false };
    component.confirmDirect(hour);

    expect(component.selectedHour()).toBe('11:00');
    expect(emitted).toEqual(['11:00']);
  });

  it('should not change selectedHour or emit on confirmDirect for disabled hour', () => {
    const emitted: string[] = [];
    component.hourSelected.subscribe(h => emitted.push(h));

    const hour = { value: '11:00', disabled: true };
    component.confirmDirect(hour);

    expect(component.selectedHour()).toBeNull();
    expect(emitted.length).toBe(0);
  });

  it('should emit back on goBack', () => {
    let called = false;
    component.back.subscribe(() => (called = true));

    component.goBack();

    expect(called).toBeTrue();
  });
});

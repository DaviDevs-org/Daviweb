import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthenticationService } from '@presentation/shared/authentication.service';
import { Router } from '@angular/router';
import { AlertService } from '@presentation/shared/alert/alert.service';
import { SaasConfigService } from 'src/app/config/saas-config.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authSpy: jasmine.SpyObj<AuthenticationService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let alertSpy: jasmine.SpyObj<AlertService>;
  let saasConfigSpy: jasmine.SpyObj<SaasConfigService>;


  beforeEach(async () => {
    authSpy = jasmine.createSpyObj<AuthenticationService>('AuthenticationService', ['login']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    alertSpy = jasmine.createSpyObj<AlertService>('AlertService', ['error', 'info']);
    saasConfigSpy = jasmine.createSpyObj<SaasConfigService>('SaasConfigService', ['getAll']);

        saasConfigSpy.getAll.and.returnValue({
            business: {
                name: 'Test Barber',
                ownerName: 'Owner',
                instagram: '@test',
                facebook: 'test',
                currency: 'EUR',
                currencySymbol: '€',
                opinionsUrl: 'https://example.com/opinions',
            }
        } as any);

    await TestBed.configureTestingModule({
      imports: [LoginComponent], // standalone component
      providers: [
        { provide: AuthenticationService, useValue: authSpy },
        { provide: Router, useValue: routerSpy },
        { provide: AlertService, useValue: alertSpy },
        { provide: SaasConfigService, useValue: saasConfigSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display business name in header', () => {
  const compiled = fixture.nativeElement as HTMLElement;
  const title = compiled.querySelector('.login-header h2');

  expect(title).not.toBeNull();
  expect(title!.textContent).toContain('TEST BARBER'); // from getAll().business.name.toUpperCase()
});

it('should toggle password visibility', () => {
  expect(component.showPassword).toBeFalse();

  component.togglePasswordVisibility();
  expect(component.showPassword).toBeTrue();

  component.togglePasswordVisibility();
  expect(component.showPassword).toBeFalse();
});

it('should change input type when toggling password visibility', () => {
  const compiled = fixture.nativeElement as HTMLElement;
  const input = compiled.querySelector('#password') as HTMLInputElement;

  expect(input.type).toBe('password');

  component.togglePasswordVisibility();
  fixture.detectChanges();

  expect(input.type).toBe('text');
});

it('should not call auth.login if email or password is empty', async () => {
  component.loginData.email = '';
  component.loginData.password = '';

  await component.onSubmit();

  expect(authSpy.login).not.toHaveBeenCalled();
});

it('should call auth.login and navigate on successful login', async () => {
  component.loginData.email = 'test@example.com';
  component.loginData.password = 'secret';

authSpy.login.and.returnValue(
  Promise.resolve({
    success: true,
    token: 'fake-token',
    user: {} as any,  // minimal fake user
  })
);

  await component.onSubmit();

  expect(authSpy.login).toHaveBeenCalledWith('test@example.com', 'secret');
  expect(routerSpy.navigate).toHaveBeenCalledWith(['admin']);
  expect(component.isLoading).toBeFalse();
});

it('should show error toast on failed login', async () => {
  component.loginData.email = 'test@example.com';
  component.loginData.password = 'wrong';

  authSpy.login.and.returnValue(
    Promise.resolve({ success: false, error: { message: 'Invalid credentials' } })
  );

  await component.onSubmit();

  expect(authSpy.login).toHaveBeenCalled();
  expect(routerSpy.navigate).not.toHaveBeenCalled();
  expect(alertSpy.error).toHaveBeenCalledWith('Invalid credentials');
  expect(component.isLoading).toBeFalse();
});

it('should show info toast on forgot password', () => {
  component.onForgotPassword();

  expect(alertSpy.info).toHaveBeenCalledWith(
    'Contacte con el administrador para recuperar la contraseña'
  );
});
});

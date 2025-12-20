import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { GetServicesUseCase } from './get-services.use-case';
import { CreateServiceUseCase } from './create-service.use-case';
import { UpdateServiceUseCase } from './update-service.use-case';
import { DeleteServiceUseCase } from './delete-service.use-case';
import { ServiceRepository } from './service.repository.interface';
import { Service, ServiceDTO } from '@domain/services';

describe('Service Use Cases', () => {
  // Sample service DTOs for testing
  const createMockServiceDTOs = (): ServiceDTO[] => [
    {
      id: 'svc-1',
      name: 'Corte básico',
      description: 'Corte de pelo tradicional',
      timeSegments: [{ duration: 30, breakAfter: 0 }],
      requiresHairLength: false,
    },
    {
      id: 'svc-2',
      name: 'Corte + Barba',
      description: 'Corte de pelo con arreglo de barba',
      timeSegments: [
        { duration: 30, breakAfter: 5 },
        { duration: 15, breakAfter: 0 },
      ],
      requiresHairLength: false,
    },
    {
      id: 'svc-3',
      name: 'Tinte completo',
      description: 'Coloración completa',
      timeSegments: [],
      requiresHairLength: true,
      hairLengthModifiers: {
        short: { time: 45 },
        medium: { time: 60 },
        long: { time: 90 },
      },
    },
  ];

  describe('GetServicesUseCase', () => {
    let useCase: GetServicesUseCase;
    let mockRepository: jasmine.SpyObj<ServiceRepository>;

    beforeEach(() => {
      mockRepository = jasmine.createSpyObj('ServiceRepository', [
        'getServices',
        'addService',
        'updateService',
        'deleteService',
      ]);

      TestBed.configureTestingModule({
        providers: [
          GetServicesUseCase,
          { provide: ServiceRepository, useValue: mockRepository },
        ],
      });

      useCase = TestBed.inject(GetServicesUseCase);
    });

    it('should be created', () => {
      expect(useCase).toBeTruthy();
    });

    it('should return services transformed from DTOs', (done) => {
      const mockDTOs = createMockServiceDTOs();
      mockRepository.getServices.and.returnValue(of(mockDTOs));

      useCase.execute().subscribe((services) => {
        expect(services.length).toBe(3);
        expect(services[0]).toBeInstanceOf(Service);
        expect(services[0].name).toBe('Corte básico');
        expect(services[1].name).toBe('Corte + Barba');
        expect(services[2].name).toBe('Tinte completo');
        done();
      });
    });

    it('should properly transform hair length modifiers', (done) => {
      const mockDTOs = createMockServiceDTOs();
      mockRepository.getServices.and.returnValue(of(mockDTOs));

      useCase.execute().subscribe((services) => {
        const tinteService = services[2];
        expect(tinteService.requiresHairLength).toBeTrue();
        expect(tinteService.hairLengthModifiers.short.time).toBe(45);
        expect(tinteService.hairLengthModifiers.medium.time).toBe(60);
        expect(tinteService.hairLengthModifiers.long.time).toBe(90);
        done();
      });
    });

    it('should return empty array when no services', (done) => {
      mockRepository.getServices.and.returnValue(of([]));

      useCase.execute().subscribe((services) => {
        expect(services).toEqual([]);
        done();
      });
    });

    it('should propagate errors from repository', (done) => {
      const error = new Error('Connection lost');
      mockRepository.getServices.and.returnValue(throwError(() => error));

      useCase.execute().subscribe({
        error: (err) => {
          expect(err.message).toBe('Connection lost');
          done();
        },
      });
    });

    it('should preserve service time segments', (done) => {
      const mockDTOs = createMockServiceDTOs();
      mockRepository.getServices.and.returnValue(of(mockDTOs));

      useCase.execute().subscribe((services) => {
        const corteBarba = services[1];
        expect(corteBarba.timeSegments.length).toBe(2);
        expect(corteBarba.timeSegments[0].duration).toBe(30);
        expect(corteBarba.timeSegments[0].breakAfter).toBe(5);
        expect(corteBarba.timeSegments[1].duration).toBe(15);
        done();
      });
    });
  });

  describe('CreateServiceUseCase', () => {
    let useCase: CreateServiceUseCase;
    let mockRepository: jasmine.SpyObj<ServiceRepository>;

    beforeEach(() => {
      mockRepository = jasmine.createSpyObj('ServiceRepository', [
        'getServices',
        'addService',
        'updateService',
        'deleteService',
      ]);

      TestBed.configureTestingModule({
        providers: [
          CreateServiceUseCase,
          { provide: ServiceRepository, useValue: mockRepository },
        ],
      });

      useCase = TestBed.inject(CreateServiceUseCase);
    });

    it('should be created', () => {
      expect(useCase).toBeTruthy();
    });

    it('should create service and return ID', (done) => {
      const newService = new Service(
        'Nuevo servicio',
        'Descripción del nuevo servicio',
        [{ duration: 45, breakAfter: 0 }]
      );

      mockRepository.addService.and.returnValue(Promise.resolve('new-svc-123'));

      useCase.execute(newService).subscribe((id) => {
        expect(id).toBe('new-svc-123');
        expect(mockRepository.addService).toHaveBeenCalledWith(newService);
        done();
      });
    });

    it('should handle creation errors', (done) => {
      const newService = Service.createEmpty();
      const error = new Error('Validation failed');
      mockRepository.addService.and.returnValue(Promise.reject(error));

      useCase.execute(newService).subscribe({
        error: (err) => {
          expect(err.message).toBe('Validation failed');
          done();
        },
      });
    });
  });

  describe('UpdateServiceUseCase', () => {
    let useCase: UpdateServiceUseCase;
    let mockRepository: jasmine.SpyObj<ServiceRepository>;

    beforeEach(() => {
      mockRepository = jasmine.createSpyObj('ServiceRepository', [
        'getServices',
        'addService',
        'updateService',
        'deleteService',
      ]);

      TestBed.configureTestingModule({
        providers: [
          UpdateServiceUseCase,
          { provide: ServiceRepository, useValue: mockRepository },
        ],
      });

      useCase = TestBed.inject(UpdateServiceUseCase);
    });

    it('should be created', () => {
      expect(useCase).toBeTruthy();
    });

    it('should update service successfully', async () => {
      const updatedService = new Service(
        'Servicio actualizado',
        'Nueva descripción',
        [{ duration: 60, breakAfter: 10 }],
        false,
        Service.defaultHairLengthModifiers(),
        undefined,
        'svc-1'
      );

      mockRepository.updateService.and.returnValue(Promise.resolve());

      await useCase.execute('svc-1', updatedService);

      expect(mockRepository.updateService).toHaveBeenCalledWith(
        'svc-1',
        updatedService
      );
    });

    it('should handle update errors', async () => {
      const updatedService = Service.createEmpty();
      const error = new Error('Service not found');
      mockRepository.updateService.and.returnValue(Promise.reject(error));

      await expectAsync(
        useCase.execute('invalid-id', updatedService)
      ).toBeRejectedWithError('Service not found');
    });
  });

  describe('DeleteServiceUseCase', () => {
    let useCase: DeleteServiceUseCase;
    let mockRepository: jasmine.SpyObj<ServiceRepository>;

    beforeEach(() => {
      mockRepository = jasmine.createSpyObj('ServiceRepository', [
        'getServices',
        'addService',
        'updateService',
        'deleteService',
      ]);

      TestBed.configureTestingModule({
        providers: [
          DeleteServiceUseCase,
          { provide: ServiceRepository, useValue: mockRepository },
        ],
      });

      useCase = TestBed.inject(DeleteServiceUseCase);
    });

    it('should be created', () => {
      expect(useCase).toBeTruthy();
    });

    it('should delete service successfully', (done) => {
      mockRepository.deleteService.and.returnValue(Promise.resolve());

      useCase.execute('svc-1').subscribe({
        complete: () => {
          expect(mockRepository.deleteService).toHaveBeenCalledWith('svc-1');
          done();
        },
      });
    });

    it('should handle deletion errors', (done) => {
      const error = new Error('Cannot delete service with active appointments');
      mockRepository.deleteService.and.returnValue(Promise.reject(error));

      useCase.execute('svc-in-use').subscribe({
        error: (err) => {
          expect(err.message).toBe(
            'Cannot delete service with active appointments'
          );
          done();
        },
      });
    });
  });

  describe('Use Case Integration', () => {
    let getUseCase: GetServicesUseCase;
    let createUseCase: CreateServiceUseCase;
    let mockRepository: jasmine.SpyObj<ServiceRepository>;

    beforeEach(() => {
      mockRepository = jasmine.createSpyObj('ServiceRepository', [
        'getServices',
        'addService',
        'updateService',
        'deleteService',
      ]);

      TestBed.configureTestingModule({
        providers: [
          GetServicesUseCase,
          CreateServiceUseCase,
          { provide: ServiceRepository, useValue: mockRepository },
        ],
      });

      getUseCase = TestBed.inject(GetServicesUseCase);
      createUseCase = TestBed.inject(CreateServiceUseCase);
    });

    it('should work with Service entity methods', (done) => {
      const mockDTOs = createMockServiceDTOs();
      mockRepository.getServices.and.returnValue(of(mockDTOs));

      getUseCase.execute().subscribe((services) => {
        // Test entity methods work after transformation
        const tinteService = services[2];

        expect(tinteService.computeTotalTime('short')).toBe(45);
        expect(tinteService.computeTotalTime('long')).toBe(90);
        expect(tinteService.getEstimatedTimeRange()).toBe('45-90 min');

        const corteBarba = services[1];
        // Active: 30 + 15 = 45, Total: 30 + 5 + 15 = 50
        expect(corteBarba.getActiveTime()).toBe(45);
        expect(corteBarba.computeTotalTime()).toBe(50);

        done();
      });
    });

    it('should validate services before creation', (done) => {
      // Create invalid service (empty name)
      const invalidService = new Service('', 'Description', [
        { duration: 30, breakAfter: 0 },
      ]);

      // Validation should catch this
      const validationError = invalidService.validate();
      expect(validationError).not.toBeNull();

      // If we try to create anyway, repository would be called
      mockRepository.addService.and.returnValue(
        Promise.resolve('invalid-svc-id')
      );

      // Note: Use case doesn't validate - that's presentation layer's job
      // This documents current behavior
      createUseCase.execute(invalidService).subscribe((id) => {
        expect(id).toBe('invalid-svc-id');
        done();
      });
    });
  });
});

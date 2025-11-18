import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../prisma.service';

describe('TenantsService', () => {
  let service: TenantsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    tenant: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new tenant with generated API key', async () => {
      const createDto = { name: 'Test Tenant' };
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        apiKey: 'api-key-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.tenant.create.mockResolvedValue(mockTenant);

      const result = await service.create(createDto);

      expect(result).toEqual(mockTenant);
      expect(mockPrismaService.tenant.create).toHaveBeenCalledWith({
        data: { name: createDto.name },
      });
    });
  });

  describe('findAll', () => {
    it('should return all tenants ordered by creation date', async () => {
      const mockTenants = [
        {
          id: 'tenant-1',
          name: 'Tenant 1',
          apiKey: 'api-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'tenant-2',
          name: 'Tenant 2',
          apiKey: 'api-2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.tenant.findMany.mockResolvedValue(mockTenants);

      const result = await service.findAll();

      expect(result).toEqual(mockTenants);
      expect(mockPrismaService.tenant.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no tenants exist', async () => {
      mockPrismaService.tenant.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a tenant with counts', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        apiKey: 'api-key-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          customers: 5,
          plans: 3,
          subscriptions: 10,
        },
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.findOne('tenant-123');

      expect(result).toEqual(mockTenant);
      expect(mockPrismaService.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
        include: {
          _count: {
            select: {
              customers: true,
              plans: true,
              subscriptions: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent')).rejects.toThrow(
        'Tenant with ID non-existent not found',
      );
    });
  });

  describe('update', () => {
    it('should update a tenant', async () => {
      const updateDto = { name: 'Updated Tenant' };
      const existingTenant = {
        id: 'tenant-123',
        name: 'Original Tenant',
        apiKey: 'api-key-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedTenant = { ...existingTenant, name: 'Updated Tenant' };

      mockPrismaService.tenant.findUnique.mockResolvedValue(existingTenant);
      mockPrismaService.tenant.update.mockResolvedValue(updatedTenant);

      const result = await service.update('tenant-123', updateDto);

      expect(result).toEqual(updatedTenant);
      expect(mockPrismaService.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
        data: updateDto,
      });
    });

    it('should throw NotFoundException when updating non-existent tenant', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a tenant', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        apiKey: 'api-key-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrismaService.tenant.delete.mockResolvedValue(mockTenant);

      const result = await service.remove('tenant-123');

      expect(result).toEqual({ message: 'Tenant tenant-123 deleted successfully' });
      expect(mockPrismaService.tenant.delete).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
      });
    });

    it('should throw NotFoundException when deleting non-existent tenant', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

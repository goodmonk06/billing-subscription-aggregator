import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPlanDto: CreatePlanDto) {
    return await this.prisma.plan.create({
      data: {
        tenantId: createPlanDto.tenantId,
        name: createPlanDto.name,
        price: createPlanDto.price,
        currency: createPlanDto.currency || 'usd',
        billingInterval: createPlanDto.billingInterval,
        providerPlanIdsJson: createPlanDto.providerPlanIdsJson,
        description: createPlanDto.description,
      },
    });
  }

  async findAll(tenantId?: string) {
    return await this.prisma.plan.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    return plan;
  }

  async update(id: string, updatePlanDto: UpdatePlanDto) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    return await this.prisma.plan.update({
      where: { id },
      data: updatePlanDto,
    });
  }

  async remove(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    await this.prisma.plan.delete({
      where: { id },
    });

    return { message: `Plan ${id} deleted successfully` };
  }
}

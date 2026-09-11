import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MARKETPLACE_DEFAULT_CATEGORIES } from '../domain/marketplace-constants';

@Injectable()
export class MarketplaceCategoryService implements OnModuleInit {
  private readonly logger = new Logger(MarketplaceCategoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultCategories();
  }

  async seedDefaultCategories(): Promise<void> {
    try {
      for (const cat of MARKETPLACE_DEFAULT_CATEGORIES) {
        await this.prisma.marketplaceCategory.upsert({
          where: { slug: cat.slug },
          update: {
            name: cat.name,
            description: cat.description,
            icon: cat.icon,
            sortOrder: cat.sortOrder,
            isActive: true,
          },
          create: {
            slug: cat.slug,
            name: cat.name,
            description: cat.description,
            icon: cat.icon,
            sortOrder: cat.sortOrder,
            isActive: true,
          },
        });
      }
      this.logger.log('Marketplace default categories seeded / verified');
    } catch (err: any) {
      this.logger.warn(`Failed to seed default marketplace categories: ${err.message}`);
    }
  }

  async getCategories() {
    return this.prisma.marketplaceCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            listings: {
              where: { status: 'PUBLISHED', visibility: 'PUBLIC' },
            },
          },
        },
      },
    });
  }

  async getCategoryBySlug(slug: string) {
    return this.prisma.marketplaceCategory.findUnique({
      where: { slug },
    });
  }

  async getCategoryById(id: string) {
    return this.prisma.marketplaceCategory.findUnique({
      where: { id },
    });
  }
}

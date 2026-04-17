import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('commerce/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /////////////////////////////////////////////////////////
  // GET ALL
  /////////////////////////////////////////////////////////
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: any) {
    return this.productsService.findAll(req.user.tenantId);
  }

  /////////////////////////////////////////////////////////
  // SEARCH
  /////////////////////////////////////////////////////////
  @UseGuards(JwtAuthGuard)
  @Get('search')
  search(@Req() req: any, @Query('q') q: string) {
    return this.productsService.search(req.user.tenantId, q);
  }

  /////////////////////////////////////////////////////////
  // BARCODE
  /////////////////////////////////////////////////////////
  @UseGuards(JwtAuthGuard)
  @Get('barcode/:barcode')
  findByBarcode(@Req() req: any, @Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(
      req.user.tenantId,
      barcode,
    );
  }

  /////////////////////////////////////////////////////////
  // GET ONE
  /////////////////////////////////////////////////////////
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  /////////////////////////////////////////////////////////
  // CREATE
  /////////////////////////////////////////////////////////
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() body: any) {
    const user = req.user;

    if (user.role === 'agent' && !user.canManageProducts) {
      throw new ForbiddenException('Accès refusé');
    }

    return this.productsService.create({
      ...body,
      tenantId: user.tenantId,
      userId: user.id,
    });
  }

  /////////////////////////////////////////////////////////
  // UPDATE
  /////////////////////////////////////////////////////////
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const user = req.user;

    if (user.role === 'agent' && !user.canManageProducts) {
      throw new ForbiddenException('Accès refusé');
    }

    return this.productsService.update(id, body);
  }

  /////////////////////////////////////////////////////////
  // DELETE
  /////////////////////////////////////////////////////////
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    const user = req.user;

    if (user.role === 'agent' && !user.canManageProducts) {
      throw new ForbiddenException('Accès refusé');
    }

    return this.productsService.remove(id);
  }
}

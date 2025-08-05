import { Controller, Get, Res } from '@nestjs/common';
import express from 'express';
import * as fs from 'fs';

@Controller('api/redoc')
export class RedocController {
  @Get()
  async getRedoc(@Res() res: express.Response) {
    const html = fs.readFileSync('./docs/redoc.html', 'utf8');
    res.send(html);
  }
}

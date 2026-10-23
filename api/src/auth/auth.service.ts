import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { LoginDto, SignupDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const email = dto.email.toLowerCase();
    const domain = email.split('@')[1];

    const campus = await this.prisma.campus.findUnique({
      where: { emailDomain: domain },
    });
    if (!campus) {
      throw new BadRequestException('Your college email is not supported yet');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('This email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name: dto.name, campusId: campus.id },
    });

    return this.makeToken(user.id, user.campusId);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException('Wrong email or password');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Wrong email or password');
    }

    return this.makeToken(user.id, user.campusId);
  }

  private async makeToken(userId: string, campusId: string) {
    const accessToken = await this.jwt.signAsync({ sub: userId, campusId });
    return { accessToken };
  }
}
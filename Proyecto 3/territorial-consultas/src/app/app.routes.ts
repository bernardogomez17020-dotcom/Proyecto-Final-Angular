import { Routes } from '@angular/router';

import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './shared/layout/main-layout.component';
import { LoginPageComponent } from './features/auth/login-page.component';
import { AuthCallbackPageComponent } from './features/auth/auth-callback-page.component';
import { CompleteProfilePageComponent } from './features/auth/complete-profile-page.component';
import { HomePageComponent } from './features/home/home-page.component';
import { EntitiesPageComponent } from './features/admin/entities/entities-page.component';
import { OfficialsPageComponent } from './features/admin/officials/officials-page.component';
import { CitizensPageComponent } from './features/admin/citizens/citizens-page.component';
import { CategoriesPageComponent } from './features/admin/categories/categories-page.component';
import { CommunesPageComponent } from './features/admin/communes/communes-page.component';
import { NeighborhoodsPageComponent } from './features/admin/neighborhoods/neighborhoods-page.component';
import { MapPageComponent } from './features/territorial/map-page/map-page.component';
import { ConsultasPageComponent } from './features/consultas/consultas-page.component';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent, canActivate: [guestGuard] },
  { path: 'auth/callback', component: AuthCallbackPageComponent },
  { path: 'completar-perfil', component: CompleteProfilePageComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: HomePageComponent },
      { path: 'admin/entidades', component: EntitiesPageComponent, canActivate: [roleGuard('administrador')] },
      { path: 'admin/funcionarios', component: OfficialsPageComponent, canActivate: [roleGuard('administrador')] },
      { path: 'admin/ciudadanos', component: CitizensPageComponent, canActivate: [roleGuard('administrador')] },
      { path: 'admin/categorias', component: CategoriesPageComponent, canActivate: [roleGuard('administrador')] },
      { path: 'admin/comunas', component: CommunesPageComponent, canActivate: [roleGuard('administrador')] },
      { path: 'admin/barrios', component: NeighborhoodsPageComponent, canActivate: [roleGuard('administrador')] },
      { path: 'mapa', component: MapPageComponent },
      { path: 'consultas', component: ConsultasPageComponent, canActivate: [roleGuard('administrador', 'funcionario')] },
    ],
  },
  { path: '**', redirectTo: '' },
];

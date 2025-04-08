import { TestBed } from '@angular/core/testing';

import { ProyectoEventoService } from './proyecto-evento.service';

describe('ProyectoEventoService', () => {
  let service: ProyectoEventoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProyectoEventoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

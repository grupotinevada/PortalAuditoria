import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearProcesoComponent } from './crear-proceso.component';

describe('CrearProcesoComponent', () => {
  let component: CrearProcesoComponent;
  let fixture: ComponentFixture<CrearProcesoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearProcesoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearProcesoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

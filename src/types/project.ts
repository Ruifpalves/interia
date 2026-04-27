// Domain types for the editable project state.

export type WallShape = {
  id: string;
  kind: "wall";
  // Two endpoints in metres relative to canvas origin (top-left).
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
};

export type ModuleShape = {
  id: string;
  kind: "module";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  label?: string;
  fill?: string;
};

export type CircleShape = {
  id: string;
  kind: "circle";
  x: number;
  y: number;
  radius: number;
  label?: string;
};

export type DoorShape = {
  id: string;
  kind: "door";
  x: number;
  y: number;
  width: number;
  rotation?: number;
};

export type DimensionShape = {
  id: string;
  kind: "dimension";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  // Optional override; otherwise computed from coordinates.
  override?: number;
};

export type AnnotationShape = {
  id: string;
  kind: "annotation";
  x: number;
  y: number;
  text: string;
};

export type Shape = WallShape | ModuleShape | CircleShape | DoorShape | DimensionShape | AnnotationShape;

export type PlanState = {
  version: 1;
  // Logical canvas size in metres
  widthM: number;
  heightM: number;
  shapes: Shape[];
  background?: { url: string; opacity: number; scale: number; x: number; y: number };
};

export type StyleState = {
  version: 1;
  style:
    | "minimalista"
    | "contemporaneo_escuro"
    | "industrial"
    | "classico"
    | "mediterraneo";
  palette: string[];
  materials: {
    portas?: string[];
    interior?: string[];
    acabamentos?: string[];
  };
  elements: {
    led?: boolean;
    portasRecolhiveis?: boolean;
    varao?: boolean;
    lamelas?: boolean;
    bancada?: boolean;
    softClose?: boolean;
  };
  scene: {
    mesa?: boolean;
    cadeiras?: boolean;
    deck?: boolean;
    plantas?: boolean;
    iluminacaoSuspensa?: boolean;
  };
};

export type BriefingState = {
  version: 1;
  objetivo: string;
  estilo: string;
  paleta_principal: string[];
  materiais: string[];
  elementos_especiais: string[];
  restricoes: string[];
  palavras_chave_imagem: string[];
  descricao_pt: string;
};

export type MeasurementsState = {
  largura_total_m?: number;
  altura_disponivel_m?: number;
  profundidade_m?: number;
  obstaculos?: Array<{ tipo: string; forma: "circle" | "rect"; x: number; y: number; w?: number; h?: number; r?: number }>;
  aberturas?: Array<{ tipo: "porta" | "janela"; lado: "esquerda" | "direita" | "frente" | "tras"; largura_m: number }>;
};

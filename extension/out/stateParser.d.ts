import * as vscode from 'vscode';
export interface GsdState {
    milestone?: string;
    phase?: number;
    totalPhases?: number;
    plan?: number;
    status?: string;
    progress?: string;
    todos?: string[];
    blockers?: string[];
}
export interface RoadmapPhase {
    number: number;
    name: string;
    status: string;
}
export interface PhasePlan {
    file: string;
    name: string;
    uri: vscode.Uri;
}
export declare function parseStateMd(content: string): GsdState;
export declare function parseRoadmapMd(content: string): RoadmapPhase[];
export declare function parsePhaseDir(uri: vscode.Uri): Promise<PhasePlan[]>;

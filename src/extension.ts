'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { LOG } from './util/logger';
import { activateLanguageServer, configureLanguage } from './languageSetup';
import { registerDebugAdapter } from './debugSetup';
import { StatusBarEntry, Status } from './util/status';
import { fsExists } from './util/fsUtils';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    configureLanguage();

    const kotlinConfig = vscode.workspace.getConfiguration("kotlin");
    const langServerEnabled = kotlinConfig.get("languageServer.enabled");
    const debugAdapterEnabled = kotlinConfig.get("debugAdapter.enabled");
    
    if (!(await fsExists(context.globalStoragePath))) {
        await fs.promises.mkdir(context.globalStoragePath);
    }
    
    const initTasks: Promise<void>[] = [];
    
    if (langServerEnabled) {
        // Optionally a custom path to the language server executable
        let customPath = nullIfEmpty(kotlinConfig.get("languageServer.path"));
        
        initTasks.push(withSpinningStatus(context, async status => {
            await activateLanguageServer(context, status, customPath);
        }));
    } else {
        LOG.info("Skipping language server activation since 'kotlin.languageServer.enabled' is false");
    }
    
    if (debugAdapterEnabled) {
        // Optionally a custom path to the debug adapter executable
        let customPath = nullIfEmpty(kotlinConfig.get("debugAdapter.path"));
        
        initTasks.push(withSpinningStatus(context, async status => {
            await registerDebugAdapter(context, status, customPath);
        }));
    } else {
        LOG.info("Skipping debug adapter registration since 'kotlin.debugAdapter.enabled' is false");
    }
    
    await Promise.all(initTasks);
}

function nullIfEmpty(s: string): string | null {
    return (s === "") ? null : s;
}

async function withSpinningStatus(context: vscode.ExtensionContext, action: (status: Status) => Promise<void>): Promise<void> {
    const status = new StatusBarEntry(context, "$(sync~spin)");
    status.show();
    await action(status);
    status.dispose();
}

// this method is called when your extension is deactivated
export function deactivate(): void {}

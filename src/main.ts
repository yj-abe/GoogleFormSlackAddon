import Trigger = GoogleAppsScript.Script.Trigger;
import URLFetchRequestOptions = GoogleAppsScript.URL_Fetch.URLFetchRequestOptions;
import FormResponse = GoogleAppsScript.Forms.FormResponse;

const TRIGGER_FUNC_NAME = "notifyToSlack";

function onOpen(e) {
    FormApp.getUi()
        .createAddonMenu()
        .addItem("設定", "showSetting")
        .addToUi();
}

function onInstall(e) {
    onOpen(e);
}

function showSetting() {
    let ui = HtmlService.createHtmlOutputFromFile("settings")
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
        .setTitle("設定");
    FormApp.getUi().showSidebar(ui);
}

function saveSetting(settings) {
    PropertiesService.getDocumentProperties().setProperties(settings);
    adjustTrigger();
}

function adjustTrigger() {
    let form = FormApp.getActiveForm();
    let triggers = ScriptApp.getProjectTriggers();
    let currentTrigger: Trigger = null;

    let index = triggers.map(t => t.getHandlerFunction())
        .indexOf(TRIGGER_FUNC_NAME);
    if (index >= 0) {
        currentTrigger = triggers[index];
    }

    let settings = <Settings>(getSetting());
    if ((!settings.token || !settings.channel) && currentTrigger != null) {
        ScriptApp.deleteTrigger(currentTrigger);
    } else if (currentTrigger == null) {
        ScriptApp.newTrigger(TRIGGER_FUNC_NAME)
            .forForm(form)
            .onFormSubmit()
            .create();
    }

}

function getSetting() {
    return PropertiesService.getDocumentProperties().getProperties();
}

function notifyToSlack(e) {

    let authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
    if (authInfo.getAuthorizationStatus() == ScriptApp.AuthorizationStatus.REQUIRED) {
        return;
    }

    let settings = <Settings>(getSetting());
    let form = FormApp.getActiveForm();

    let message = "回答が投稿されました。\n";
    let response: FormResponse = e.response;
    response.getItemResponses().forEach(itemResponse => {
        Logger.log(itemResponse.getItem().getTitle());
        Logger.log(itemResponse.getResponse());
        message += `Q:${itemResponse.getItem().getTitle()}\nA:${itemResponse.getResponse()}\n\n`;
    });

    if (settings.users) {
        settings.users.split(",")
            .forEach(user => {
               message += user + " ";
            });
    }

    let payload = {
        "username": `${form.getTitle()} 回答通知`,
        "channel": settings.channel,
        "text": message
    };

    let options = <URLFetchRequestOptions>{
        "method"      : "post",
        "contentType" : "application/json",
        "headers": {
            "authorization": `Bearer ${settings.token}`
        },
        "payload"     : JSON.stringify(payload),
    };
    UrlFetchApp.fetch("https://slack.com/api/chat.postMessage", options);
}

interface Settings {
    token?: string;
    channel?: string;
    users?: string;
}
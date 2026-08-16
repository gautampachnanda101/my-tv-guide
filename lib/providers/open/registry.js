export function getUkOpenSourceRegistry() {
  return [
    {
      id: "tvmaze-schedule",
      name: "TVMaze UK Schedule",
      type: "schedule",
      standard: "Open API JSON",
      integration: "auto",
      required: true,
      url: "https://api.tvmaze.com/schedule?country=GB"
    },
    {
      id: "iptv-org-channels",
      name: "IPTV-org Channels",
      type: "channels",
      standard: "Open Dataset JSON",
      integration: "auto",
      required: false,
      url: "https://iptv-org.github.io/api/channels.json"
    },
    {
      id: "xmltv-feed",
      name: "XMLTV Feed",
      type: "schedule",
      standard: "XMLTV",
      integration: "auto-with-override",
      required: false,
      env: "OPEN_XMLTV_UK_URL",
      defaultUrl: "https://raw.githubusercontent.com/dp247/Freeview-EPG/master/epg.xml"
    }
  ];
}
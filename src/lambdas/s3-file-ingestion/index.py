import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, _):
  logger.info("Event: {}".format(event))

  return {
    'message': "Success"
  }

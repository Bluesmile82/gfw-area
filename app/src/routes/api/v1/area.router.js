const Router = require('koa-router');
const logger = require('logger');
const ctRegisterMicroservice = require('ct-register-microservice-node');
const Promise = require('bluebird');
const ErrorSerializer = require('serializers/error.serializer');
const AreaSerializer = require('serializers/area.serializer');
const AreaModel = require('models/area.model');
const AreaValidator = require('validators/area.validator');
const AlertsService = require('services/alerts.service');

const router = new Router({
    prefix: '/area',
});

class AreaRouter {

    static async getAll(ctx){
        logger.info('Obtaining all areas of the user ', ctx.state.loggedUser.id);
        const areas = await AreaModel.find({ userId: ctx.state.loggedUser.id });
        ctx.body = AreaSerializer.serialize(areas);
    }

    static async get(ctx){
        logger.info(`Obtaining area of the user ${ctx.state.loggedUser.id} and areaId ${ctx.params.id}`);
        const areas = await AreaModel.find({ userId: ctx.state.loggedUser.id, _id: ctx.params.id });
        ctx.body = AreaSerializer.serialize(areas);
    }

    static async save(ctx){
        logger.info('Saving area');
        const area = await new AreaModel({
            name: ctx.request.body.name,
            geostore: ctx.request.body.geostore,
            wdpaid: ctx.request.body.wdpaid,
            userId: ctx.state.loggedUser.id
        }).save();
        ctx.body = AreaSerializer.serialize(area);
    }

    static async update(ctx){
        logger.info(`Updating area with id ${ctx.params.id}`);
        const area = await AreaModel.findById(ctx.params.id);
        if (ctx.request.body.name) {
            area.name = ctx.request.body.name;
        }
        if (ctx.request.body.geostore) {
            area.geostore = ctx.request.body.geostore;
        }
        if (ctx.request.body.wdpaid) {
            area.geostore = ctx.request.body.wdpaid;
        }
        if (!area.wdpaid && !area.geostore) {
            ctx.throw(400, 'Required geostore or wdpaid');
            return;
        }
        await area.save();
        ctx.body = AreaSerializer.serialize(area);
    }

    static async delete(ctx){
        logger.info(`Deleging area with id ${ctx.params.id}`);
        const result = await AreaModel.remove({ _id: ctx.params.id });
        if (!result || !result.result || result.result.ok === 0) {
            ctx.throw(404, 'Area not found');
            return;
        }
        ctx.body = '';
        ctx.statusCode = 204;
    }

    static async getAlertsOfArea(ctx){
        logger.info(`Obtaining alerts of area with id ${ctx.params.id}`);
        ctx.assert(ctx.query.precissionPoints, 400, 'precissionPoints is required');
        ctx.assert(ctx.query.precissionBBOX, 400, 'precissionBBOX is required');
        const result = await AreaModel.findOne({ _id: ctx.params.id });
        if (!result) {
            ctx.throw(404, 'Area not found');
            return;
        }
        
        let response = await AlertsService.groupAlerts(result, ctx.query.precissionPoints, ctx.query.precissionBBOX);
        ctx.body = response;
    }

}


async function loggedUserToState(ctx, next) {
    if (ctx.query && ctx.query.loggedUser){
        ctx.state.loggedUser = JSON.parse(ctx.query.loggedUser);
        delete ctx.query.loggedUser;
    } else if (ctx.request.body && ctx.request.body.loggedUser) {
        ctx.state.loggedUser = ctx.request.body.loggedUser;
        delete ctx.request.body.loggedUser;
    } else {
        ctx.throw(401, 'Not logged');
        return;
    }
    await next();
}

async function checkPermission(ctx, next) {
    ctx.assert(ctx.params.id, 400, 'Id required');
    let area = await AreaModel.findById(ctx.params.id);
    if (!area) {
        ctx.throw(404, 'Area not found');
        return;
    }
    if (area.userId !== ctx.state.loggedUser.id) {
        ctx.throw(403, 'Not authorized');
        return;
    }
    await next();
}

router.post('/', loggedUserToState, AreaValidator.create, AreaRouter.save);
router.patch('/:id', loggedUserToState, checkPermission, AreaValidator.update, AreaRouter.update);
router.get('/', loggedUserToState, AreaRouter.getAll);
router.get('/:id', loggedUserToState, AreaRouter.get);
router.get('/:id/alerts', loggedUserToState, AreaRouter.getAlertsOfArea);
router.delete('/:id', loggedUserToState, checkPermission, AreaRouter.delete);

module.exports = router;
